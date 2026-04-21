"""
Experiment 4 Training Script
─────────────────────────────
MTG-Inspired Attention ViT with:
  ✦ Score-centering (mean subtraction on attention logits)
  ✦ Variance normalization (standardised attention scores)
  ✦ Pre-LayerNorm with residual connections
  ✦ GELU FFN
  ✦ Stable rank computation per layer/step

Architecture: patch embed → [LN → MTG-Attn → residual, LN → FFN → residual] × L → LN → cls head
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
import torchvision
import torchvision.transforms as transforms
from torch.utils.data import DataLoader
import numpy as np
from typing import Dict, List


# ── Stable Rank ──────────────────────────────────────────────

def stable_rank(A):
    """SVD-based stable rank: sum(s^2) / s_max^2."""
    with torch.no_grad():
        try:
            A = A[:, :2, :, :]
            B, H, T, _ = A.shape
            A = A.reshape(B * H, T, T)
            S = torch.linalg.svdvals(A.float().cpu())
            sr = (S ** 2).sum(dim=-1) / (S[:, 0] ** 2 + 1e-8)
            val = sr.mean().item()
            if not np.isfinite(val):
                return 1.0
            return val
        except Exception:
            return 1.0


# ── Patch Embedding ──────────────────────────────────────────

class PatchEmbedding(nn.Module):
    def __init__(self, img_size=32, patch_size=4, in_channels=3, embed_dim=128):
        super().__init__()
        self.n_patches = (img_size // patch_size) ** 2
        self.proj = nn.Conv2d(in_channels, embed_dim, kernel_size=patch_size, stride=patch_size)

    def forward(self, x):
        x = self.proj(x)
        x = x.flatten(2).transpose(1, 2)
        return x


# ── MTG Attention Head ───────────────────────────────────────

class MTGHead(nn.Module):
    """
    Mind-The-Gap attention head: score-centering and variance normalisation
    before softmax, which eliminates attention noise and improves signal
    propagation (higher stable rank).
    """
    def __init__(self, embed_dim, head_size):
        super().__init__()
        self.key = nn.Linear(embed_dim, head_size, bias=False)
        self.query = nn.Linear(embed_dim, head_size, bias=False)
        self.value = nn.Linear(embed_dim, head_size, bias=False)
        self.eps = 1e-5

    def forward(self, x):
        B, T, C = x.shape
        k = self.key(x)
        q = self.query(x)
        v = self.value(x)

        # Standard scaled dot-product
        wei = q @ k.transpose(-2, -1) * (k.size(-1) ** -0.5)

        # ── MTG: score-centering ──
        wei = wei - wei.mean(dim=-1, keepdim=True)

        # ── MTG: variance normalisation ──
        var = wei.var(dim=-1, keepdim=True, unbiased=False)
        wei = wei / torch.sqrt(var + self.eps)

        wei = F.softmax(wei, dim=-1)
        out = wei @ v
        return out, wei


# ── MTG Multi-Head Attention ─────────────────────────────────

class MTGMultiHeadAttention(nn.Module):
    def __init__(self, embed_dim, num_heads):
        super().__init__()
        head_size = embed_dim // num_heads
        self.heads = nn.ModuleList([MTGHead(embed_dim, head_size) for _ in range(num_heads)])
        self.proj = nn.Linear(embed_dim, embed_dim)

    def forward(self, x):
        outs, attns = zip(*[h(x) for h in self.heads])
        out = torch.cat(outs, dim=-1)
        out = self.proj(out)
        attn = torch.stack(attns, dim=1)  # (B, n_head, T, T)
        return out, attn


# ── Feed-Forward ─────────────────────────────────────────────

class FeedForward(nn.Module):
    def __init__(self, embed_dim):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(embed_dim, 4 * embed_dim),
            nn.GELU(),
            nn.Linear(4 * embed_dim, embed_dim),
        )

    def forward(self, x):
        return self.net(x)


# ── MTG Transformer Block ───────────────────────────────────

class MTGBlock(nn.Module):
    """Pre-LayerNorm block with MTG attention and residual connections."""
    def __init__(self, embed_dim, num_heads):
        super().__init__()
        self.sa = MTGMultiHeadAttention(embed_dim, num_heads)
        self.ffwd = FeedForward(embed_dim)
        self.ln1 = nn.LayerNorm(embed_dim)
        self.ln2 = nn.LayerNorm(embed_dim)

    def forward(self, x):
        attn_out, attn_map = self.sa(self.ln1(x))
        x = x + attn_out    # residual
        x = x + self.ffwd(self.ln2(x))  # residual
        return x, attn_map


# ── MTG ViT Model ───────────────────────────────────────────

class MTGViT(nn.Module):
    """
    Vision Transformer with MTG-Inspired Attention.
    Score-centering + variance normalisation in attention heads.
    """
    def __init__(self, num_layers=6, num_heads=4, embed_dim=128,
                 img_size=32, patch_size=4, in_channels=3, num_classes=10):
        super().__init__()
        self.patch_embed = PatchEmbedding(img_size, patch_size, in_channels, embed_dim)
        num_patches = self.patch_embed.n_patches
        self.cls_token = nn.Parameter(torch.zeros(1, 1, embed_dim))
        self.pos_embed = nn.Parameter(torch.randn(1, num_patches + 1, embed_dim) * 0.02)
        self.blocks = nn.ModuleList([
            MTGBlock(embed_dim, num_heads) for _ in range(num_layers)
        ])
        self.ln_f = nn.LayerNorm(embed_dim)
        self.head = nn.Linear(embed_dim, num_classes)

    def forward(self, x, compute_sr=False):
        B = x.size(0)
        x = self.patch_embed(x)
        cls = self.cls_token.expand(B, -1, -1)
        x = torch.cat([cls, x], dim=1)
        x = x + self.pos_embed

        layer_srs = []
        for block in self.blocks:
            x, attn = block(x)
            if compute_sr:
                layer_srs.append(stable_rank(attn))

        x = self.ln_f(x)
        cls_token = x[:, 0]
        logits = self.head(cls_token)
        return logits, layer_srs

    def get_weights(self) -> Dict[str, np.ndarray]:
        weights = {}
        for name, param in self.named_parameters():
            weights[name] = param.detach().cpu().numpy()
        return weights


# ── Data Loader ──────────────────────────────────────────────

def get_dataloader(dataset: str = "cifar10", batch_size: int = 128):
    transform = transforms.Compose([transforms.ToTensor()])

    train_dataset = torchvision.datasets.CIFAR10(root="./data", train=True, download=True, transform=transform)
    test_dataset = torchvision.datasets.CIFAR10(root="./data", train=False, download=True, transform=transform)

    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True, num_workers=0)
    test_loader = DataLoader(test_dataset, batch_size=batch_size, shuffle=False, num_workers=0)
    return train_loader, test_loader


# ── Training Loop ────────────────────────────────────────────

def train_epoch(model, train_loader, criterion, optimizer, device, compute_sr=True, sr_interval=50):
    model.train()
    running_loss = 0.0
    correct = 0
    total = 0

    sr_per_layer = {}
    sr_overall = []
    sr_steps = []

    if not hasattr(train_epoch, '_global_step'):
        train_epoch._global_step = 0

    global_step = train_epoch._global_step

    for batch_idx, (inputs, targets) in enumerate(train_loader):
        inputs, targets = inputs.to(device), targets.to(device)
        global_step += 1

        do_sr = compute_sr and (global_step % sr_interval == 0)

        optimizer.zero_grad()
        outputs, layer_srs = model(inputs, compute_sr=do_sr)
        loss = criterion(outputs, targets)
        loss.backward()
        optimizer.step()

        running_loss += loss.item()
        _, predicted = outputs.max(1)
        total += targets.size(0)
        correct += predicted.eq(targets).sum().item()

        if do_sr and layer_srs:
            sr_steps.append(global_step)
            overall = sum(layer_srs) / len(layer_srs)
            sr_overall.append(round(overall, 4))
            for i, sr in enumerate(layer_srs):
                key = f"layer_{i}"
                if key not in sr_per_layer:
                    sr_per_layer[key] = []
                sr_per_layer[key].append(round(sr, 4))

    train_epoch._global_step = global_step

    return {
        "loss": running_loss / len(train_loader),
        "accuracy": 100.0 * correct / total,
        "sr_per_layer": sr_per_layer,
        "sr_overall": sr_overall,
        "sr_steps": sr_steps,
    }


def evaluate(model, test_loader, criterion, device):
    model.eval()
    running_loss = 0.0
    correct = 0
    total = 0

    with torch.no_grad():
        for inputs, targets in test_loader:
            inputs, targets = inputs.to(device), targets.to(device)
            outputs, _ = model(inputs, compute_sr=False)
            loss = criterion(outputs, targets)

            running_loss += loss.item()
            _, predicted = outputs.max(1)
            total += targets.size(0)
            correct += predicted.eq(targets).sum().item()

    return {
        "loss": running_loss / len(test_loader),
        "accuracy": 100.0 * correct / total,
    }
