import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader
import torchvision
import torchvision.transforms as transforms
import numpy as np
from typing import Dict, List, Any

class AttentionBlock(nn.Module):
    def __init__(self, in_channels, num_heads=4):
        super().__init__()
        self.num_heads = num_heads
        self.attention = nn.MultiheadAttention(in_channels, num_heads, batch_first=True)
        self.norm = nn.LayerNorm(in_channels)
        self.fc = nn.Linear(in_channels, in_channels)
        
    def forward(self, x):
        attn_out, _ = self.attention(x, x, x)
        x = self.norm(x + attn_out)
        ff_out = self.fc(x)
        return self.norm(x + ff_out)


class AttentionCNN(nn.Module):
    def __init__(self, num_attention_layers=3, dataset="cifar10"):
        super().__init__()
        self.num_attention_layers = num_attention_layers
        
        if dataset.lower() == "mnist":
            in_channels = 1
            num_classes = 10
            self.conv1 = nn.Conv2d(1, 32, 3, padding=1)
            self.feature_size = 32 * 7 * 7
        else:
            in_channels = 3
            num_classes = 10
            self.conv1 = nn.Conv2d(3, 64, 3, padding=1)
            self.feature_size = 64 * 8 * 8
        
        self.bn1 = nn.BatchNorm2d(32 if dataset.lower() == "mnist" else 64)
        self.pool = nn.MaxPool2d(2, 2)
        
        self.conv2 = nn.Conv2d(32 if dataset.lower() == "mnist" else 64, 64, 3, padding=1)
        self.bn2 = nn.BatchNorm2d(64)
        
        hidden_dim = 128
        self.attention_layers = nn.ModuleList([
            AttentionBlock(hidden_dim, num_heads=4) for _ in range(num_attention_layers)
        ])
        
        self.fc_in = nn.Linear(self.feature_size, hidden_dim)
        self.fc_out = nn.Linear(hidden_dim, num_classes)
        
    def forward(self, x):
        x = self.pool(torch.relu(self.bn1(self.conv1(x))))
        x = self.pool(torch.relu(self.bn2(self.conv2(x))))
        
        x = x.view(x.size(0), -1)
        x = self.fc_in(x)
        x = x.unsqueeze(1)
        
        for attn_layer in self.attention_layers:
            x = attn_layer(x)
        
        x = x.squeeze(1)
        return self.fc_out(x)
    
    def get_weights(self) -> Dict[str, np.ndarray]:
        weights = {}
        for name, param in self.named_parameters():
            weights[name] = param.detach().cpu().numpy()
        return weights


def get_dataloader(dataset_name: str, batch_size: int = 32):
    if dataset_name.lower() == "mnist":
        transform = transforms.Compose([
            transforms.Resize((28, 28)),
            transforms.ToTensor(),
            transforms.Normalize((0.5,), (0.5,))
        ])
        train_dataset = torchvision.datasets.MNIST(
            root="./data", train=True, download=True, transform=transform
        )
        test_dataset = torchvision.datasets.MNIST(
            root="./data", train=False, download=True, transform=transform
        )
    else:
        transform = transforms.Compose([
            transforms.Resize((32, 32)),
            transforms.ToTensor(),
            transforms.Normalize((0.5, 0.5, 0.5), (0.5, 0.5, 0.5))
        ])
        train_dataset = torchvision.datasets.CIFAR10(
            root="./data", train=True, download=True, transform=transform
        )
        test_dataset = torchvision.datasets.CIFAR10(
            root="./data", train=False, download=True, transform=transform
        )
    
    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True)
    test_loader = DataLoader(test_dataset, batch_size=batch_size, shuffle=False)
    
    return train_loader, test_loader


def train_model(
    model: nn.Module,
    train_loader: DataLoader,
    epochs: int,
    learning_rate: float = 0.001,
    device: str = "cpu"
) -> Dict[str, List[float]]:
    model.to(device)
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=learning_rate)
    
    history = {"train_loss": [], "train_acc": []}
    
    for epoch in range(epochs):
        model.train()
        running_loss = 0.0
        correct = 0
        total = 0
        
        for batch_idx, (inputs, targets) in enumerate(train_loader):
            inputs, targets = inputs.to(device), targets.to(device)
            
            optimizer.zero_grad()
            outputs = model(inputs)
            loss = criterion(outputs, targets)
            loss.backward()
            optimizer.step()
            
            running_loss += loss.item()
            _, predicted = outputs.max(1)
            total += targets.size(0)
            correct += predicted.eq(targets).sum().item()
        
        avg_loss = running_loss / len(train_loader)
        accuracy = 100.0 * correct / total
        
        history["train_loss"].append(avg_loss)
        history["train_acc"].append(accuracy)
        
        print(f"Epoch {epoch+1}/{epochs} - Loss: {avg_loss:.4f} - Acc: {accuracy:.2f}%")
    
    return history
