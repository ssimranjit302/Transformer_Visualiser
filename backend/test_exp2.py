"""Quick test: train exp2 model directly to verify it learns."""
import sys
sys.path.insert(0, '.')

import torch
import torch.nn as nn
import torch.optim as optim

from models.exp2_training import Exp2AttentionCNN, get_augmented_dataloader, train_epoch, evaluate

# Same params as user
model = Exp2AttentionCNN(num_attention_layers=6, num_heads=4, hidden_dim=128)
train_loader, test_loader = get_augmented_dataloader(batch_size=32)

device = "cpu"
model.to(device)
criterion = nn.CrossEntropyLoss()
optimizer = optim.AdamW(model.parameters(), lr=1e-3)

print(f"Model params: {sum(p.numel() for p in model.parameters()):,}")
print(f"Train batches: {len(train_loader)}, Test batches: {len(test_loader)}")
print()

for epoch in range(3):
    train_m = train_epoch(model, train_loader, criterion, optimizer, device)
    val_m = evaluate(model, test_loader, criterion, device)
    print(f"Epoch {epoch+1}: Train Loss={train_m['loss']:.4f}, Train Acc={train_m['accuracy']:.2f}%, "
          f"Val Loss={val_m['loss']:.4f}, Val Acc={val_m['accuracy']:.2f}%")
