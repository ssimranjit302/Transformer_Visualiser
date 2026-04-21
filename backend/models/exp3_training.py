"""
Experiment 3 Training Script
─────────────────────────────
Differential Transformer ViT with:
  ✦ Differential attention (dual-query/key with lambda-based subtraction)
  ✦ RMSNorm (instead of LayerNorm)
  ✦ SwiGLU FFN
  ✦ Residual connections
  ✦ Stable rank computation per layer/step

Architecture: patch embed → [RMSNorm → DiffAttn → residual, RMSNorm → SwiGLU → residual] × L → RMSNorm → cls head
"""

import math
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


# ── RMSNorm ──────────────────────────────────────────────────

class RMSNorm(nn.Module):
    def __init__(self, dim, eps=1e-8):
        super().__init__()
        self.eps = eps
        self.weight = nn.Parameter(torch.ones(dim))

    def forward(self, x):
        rms = x.pow(2).mean(dim=-1, keepdim=True).add(self.eps).sqrt()
        return self.weight * (x / rms)


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


# ── SwiGLU Feed-Forward ─────────────────────────────────────

class SwiGLUFeedForward(nn.Module):
    def __init__(self, embed_dim, mult=4):
        super().__init__()
        hidden = mult * embed_dim
        self.w1 = nn.Linear(embed_dim, hidden)
        self.w2 = nn.Linear(embed_dim, hidden)
        self.w3 = nn.Linear(hidden, embed_dim)

    def forward(self, x):
        return self.w3(F.silu(self.w1(x)) * self.w2(x))


# ── Lambda init (from Differential Transformer paper) ────────

def lambda_init_fn(layer_idx_1based):
    return 0.8 - 0.6 * math.exp(-0.3 * (layer_idx_1based - 1))


# ── Differential Multi-Head Attention ────────────────────────

class DifferentialMultiHeadAttention(nn.Module):
    def __init__(self, embed_dim, num_heads, layer_idx_1based):
        super().__init__()
        assert embed_dim % num_heads == 0
        self.embed_dim = embed_dim
        self.num_heads = num_heads
        self.head_dim = embed_dim // num_heads

        # Dual queries and keys for differential attention
        self.q1 = nn.Linear(embed_dim, embed_dim, bias=False)
        self.q2 = nn.Linear(embed_dim, embed_dim, bias=False)
        self.k1 = nn.Linear(embed_dim, embed_dim, bias=False)
        self.k2 = nn.Linear(embed_dim, embed_dim, bias=False)
        self.v = nn.Linear(embed_dim, embed_dim, bias=False)
        self.proj = nn.Linear(embed_dim, embed_dim, bias=False)

        # Learnable lambda parameters
        self.lambda_q1 = nn.Parameter(torch.randn(self.head_dim) * 0.02)
        self.lambda_k1 = nn.Parameter(torch.randn(self.head_dim) * 0.02)
        self.lambda_q2 = nn.Parameter(torch.randn(self.head_dim) * 0.02)
        self.lambda_k2 = nn.Parameter(torch.randn(self.head_dim) * 0.02)

        self.lambda_init = lambda_init_fn(layer_idx_1based)
        self.head_norm = RMSNorm(self.head_dim)

    def compute_lambda(self):
        lam1 = torch.exp(torch.sum(self.lambda_q1 * self.lambda_k1))
        lam2 = torch.exp(torch.sum(self.lambda_q2 * self.lambda_k2))
        return lam1 - lam2 + self.lambda_init

    def forward(self, x):
        B, T, C = x.shape
        q1 = self.q1(x).view(B, T, self.num_heads, self.head_dim).transpose(1, 2)
        q2 = self.q2(x).view(B, T, self.num_heads, self.head_dim).transpose(1, 2)
        k1 = self.k1(x).view(B, T, self.num_heads, self.head_dim).transpose(1, 2)
        k2 = self.k2(x).view(B, T, self.num_heads, self.head_dim).transpose(1, 2)
        v = self.v(x).view(B, T, self.num_heads, self.head_dim).transpose(1, 2)

        scale = self.head_dim ** -0.5
        attn1 = F.softmax((q1 @ k1.transpose(-2, -1)) * scale, dim=-1)
        attn2 = F.softmax((q2 @ k2.transpose(-2, -1)) * scale, dim=-1)

        lam = self.compute_lambda()
        diff_attn = attn1 - lam * attn2

        out = diff_attn @ v
        out = self.head_norm(out)
        out = out * (1.0 - self.lambda_init)

        out = out.transpose(1, 2).contiguous().view(B, T, C)
        out = self.proj(out)

        return out, diff_attn


# ── Differential Transformer Block ───────────────────────────

class DiffBlock(nn.Module):
    def __init__(self, embed_dim, num_heads, layer_idx_1based):
        super().__init__()
        self.norm1 = RMSNorm(embed_dim)
        self.norm2 = RMSNorm(embed_dim)
        self.attn = DifferentialMultiHeadAttention(embed_dim, num_heads, layer_idx_1based)
        self.ffn = SwiGLUFeedForward(embed_dim)

    def forward(self, x):
        attn_out, attn_map = self.attn(self.norm1(x))
        x = x + attn_out    # residual
        x = x + self.ffn(self.norm2(x))  # residual
        return x, attn_map


# ── Differential ViT Model ──────────────────────────────────

class DiffViT(nn.Module):
    def __init__(self, num_layers=6, num_heads=4, embed_dim=128,
                 img_size=32, patch_size=4, in_channels=3, num_classes=10):
        super().__init__()
        self.patch_embed = PatchEmbedding(img_size, patch_size, in_channels, embed_dim)
        num_patches = self.patch_embed.n_patches
        self.cls_token = nn.Parameter(torch.zeros(1, 1, embed_dim))
        self.pos_embed = nn.Parameter(torch.randn(1, num_patches + 1, embed_dim) * 0.02)
        self.blocks = nn.ModuleList([
            DiffBlock(embed_dim, num_heads, layer_idx_1based=i + 1)
            for i in range(num_layers)
        ])
        self.norm_f = RMSNorm(embed_dim)
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

        x = self.norm_f(x)
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
