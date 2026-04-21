import torch
import torch.nn as nn
import torch.optim as optim
import time
from typing import Optional, Dict

from models.database import SessionLocal, TrainingSession
from models.exp1_training import VanillaViT, get_dataloader as exp1_get_dataloader, train_epoch, evaluate
from models.exp2_training import (
    ResidualLNViT as Exp2ViT,
    get_dataloader as exp2_get_dataloader,
    train_epoch as exp2_train_epoch,
    evaluate as exp2_evaluate,
)
from models.exp3_training import (
    DiffViT as Exp3ViT,
    get_dataloader as exp3_get_dataloader,
    train_epoch as exp3_train_epoch,
    evaluate as exp3_evaluate,
)
from models.exp4_training import (
    MTGViT as Exp4ViT,
    get_dataloader as exp4_get_dataloader,
    train_epoch as exp4_train_epoch,
    evaluate as exp4_evaluate,
)
from models.attention_net import get_dataloader

weight_cache: Dict[int, Dict] = {}
cache_timestamps: Dict[int, float] = {}
CACHE_TTL = 300

# Cancel mechanism
cancelled_sessions: set = set()


def cancel_training(session_id: int):
    cancelled_sessions.add(session_id)


def is_cancelled(session_id: int) -> bool:
    return session_id in cancelled_sessions


def invalidate_cache(session_id: int):
    if session_id in weight_cache:
        del weight_cache[session_id]
    if session_id in cache_timestamps:
        del cache_timestamps[session_id]


def get_cached_weights(session_id: int) -> Optional[Dict]:
    if session_id in weight_cache:
        timestamp = cache_timestamps.get(session_id, 0)
        if time.time() - timestamp < CACHE_TTL:
            return weight_cache[session_id]
    return None


def cache_weights(session_id: int, weights: Dict):
    weight_cache[session_id] = weights
    cache_timestamps[session_id] = time.time()


def train_and_store_weights(
    session_id: int,
    dataset: str,
    num_layers: int,
    epochs: int,
    batch_size: int,
    learning_rate: float,
    attention_type: str = "vanilla",
    n_embd: int = 128,
    n_head: int = 4
):
    db = SessionLocal()
    try:
        session = db.query(TrainingSession).filter(TrainingSession.id == session_id).first()
        if not session:
            return
        
        device = "cuda" if torch.cuda.is_available() else "cpu"
        
        model = VanillaViT(
            num_layers=num_layers,
            num_heads=n_head,
            embed_dim=n_embd,
        )
        train_loader, test_loader = exp1_get_dataloader(dataset, batch_size)
        
        model.to(device)
        criterion = nn.CrossEntropyLoss()
        optimizer = optim.AdamW(model.parameters(), lr=learning_rate)
        
        # Reset global step counter for stable rank tracking
        train_epoch._global_step = 0
        
        history = {
            "train_loss": [],
            "train_acc": [],
            "val_loss": [],
            "val_acc": [],
            "sr_per_layer": {},
            "sr_overall": [],
            "sr_steps": [],
            "current_epoch": 0,
            "total_epochs": epochs
        }
        
        for epoch in range(epochs):
            if is_cancelled(session_id):
                print(f"[Session {session_id}] Training cancelled by user at epoch {epoch}/{epochs}")
                session.training_history = dict(history)
                session.status = "cancelled"
                db.commit()
                cancelled_sessions.discard(session_id)
                return

            train_metrics = train_epoch(model, train_loader, criterion, optimizer, device, compute_sr=True, sr_interval=50)
            
            history["train_loss"].append(round(train_metrics["loss"], 4))
            history["train_acc"].append(round(train_metrics["accuracy"], 2))
            
            val_metrics = evaluate(model, test_loader, criterion, device)
            history["val_loss"].append(round(val_metrics["loss"], 4))
            history["val_acc"].append(round(val_metrics["accuracy"], 2))
            
            # Accumulate stable rank data
            for key, vals in train_metrics["sr_per_layer"].items():
                if key not in history["sr_per_layer"]:
                    history["sr_per_layer"][key] = []
                history["sr_per_layer"][key].extend(vals)
            history["sr_overall"].extend(train_metrics["sr_overall"])
            history["sr_steps"].extend(train_metrics["sr_steps"])
            
            history["current_epoch"] = epoch + 1
            
            print(f"[Session {session_id}] Epoch {epoch+1}/{epochs} - "
                  f"Train Loss: {train_metrics['loss']:.4f}, Train Acc: {train_metrics['accuracy']:.2f}% - "
                  f"Val Loss: {val_metrics['loss']:.4f}, Val Acc: {val_metrics['accuracy']:.2f}%")
            
            session.training_history = dict(history)
            db.commit()
        
        # Training complete — save weights
        weights = model.get_weights()
        weights_serializable = {}
        for key, value in weights.items():
            if hasattr(value, 'tolist'):
                weights_serializable[key] = value.tolist()
            else:
                weights_serializable[key] = value
        
        session.weights = weights_serializable
        session.status = "completed"
        db.commit()
        
        cache_weights(session_id, weights_serializable)
        
    except Exception as e:
        session = db.query(TrainingSession).filter(TrainingSession.id == session_id).first()
        if session:
            session.status = "failed"
            db.commit()
        print(f"Training failed: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


def train_and_store_weights_exp3(
    session_id: int,
    num_layers: int,
    epochs: int,
    batch_size: int,
    learning_rate: float,
    n_embd: int = 128,
    n_head: int = 4
):
    """Experiment 3: Differential Transformer ViT with stable rank tracking."""
    db = SessionLocal()
    try:
        session = db.query(TrainingSession).filter(TrainingSession.id == session_id).first()
        if not session:
            return

        device = "cuda" if torch.cuda.is_available() else "cpu"

        model = Exp3ViT(
            num_layers=num_layers,
            num_heads=n_head,
            embed_dim=n_embd,
        )
        train_loader, test_loader = exp3_get_dataloader("cifar10", batch_size)

        model.to(device)
        criterion = nn.CrossEntropyLoss()
        optimizer = optim.AdamW(model.parameters(), lr=learning_rate)

        # Reset global step counter
        exp3_train_epoch._global_step = 0

        history = {
            "train_loss": [],
            "train_acc": [],
            "val_loss": [],
            "val_acc": [],
            "sr_per_layer": {},
            "sr_overall": [],
            "sr_steps": [],
            "current_epoch": 0,
            "total_epochs": epochs
        }

        for epoch in range(epochs):
            if is_cancelled(session_id):
                print(f"[Exp3 Session {session_id}] Cancelled at epoch {epoch}/{epochs}")
                session.training_history = dict(history)
                session.status = "cancelled"
                db.commit()
                cancelled_sessions.discard(session_id)
                return

            train_metrics = exp3_train_epoch(model, train_loader, criterion, optimizer, device, compute_sr=True, sr_interval=50)

            history["train_loss"].append(round(train_metrics["loss"], 4))
            history["train_acc"].append(round(train_metrics["accuracy"], 2))

            val_metrics = exp3_evaluate(model, test_loader, criterion, device)
            history["val_loss"].append(round(val_metrics["loss"], 4))
            history["val_acc"].append(round(val_metrics["accuracy"], 2))

            # Accumulate stable rank data
            for key, vals in train_metrics["sr_per_layer"].items():
                if key not in history["sr_per_layer"]:
                    history["sr_per_layer"][key] = []
                history["sr_per_layer"][key].extend(vals)
            history["sr_overall"].extend(train_metrics["sr_overall"])
            history["sr_steps"].extend(train_metrics["sr_steps"])

            history["current_epoch"] = epoch + 1

            print(f"[Exp3 Session {session_id}] Epoch {epoch+1}/{epochs} - "
                  f"Train Loss: {train_metrics['loss']:.4f}, Train Acc: {train_metrics['accuracy']:.2f}% - "
                  f"Val Loss: {val_metrics['loss']:.4f}, Val Acc: {val_metrics['accuracy']:.2f}%")

            session.training_history = dict(history)
            db.commit()

        # Training complete
        weights = model.get_weights()
        weights_serializable = {}
        for key, value in weights.items():
            if hasattr(value, 'tolist'):
                weights_serializable[key] = value.tolist()
            else:
                weights_serializable[key] = value

        session.weights = weights_serializable
        session.status = "completed"
        db.commit()

        cache_weights(session_id, weights_serializable)

    except Exception as e:
        session = db.query(TrainingSession).filter(TrainingSession.id == session_id).first()
        if session:
            session.status = "failed"
            db.commit()
        print(f"Exp3 Training failed: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

def train_and_store_weights_exp2(
    session_id: int,
    num_layers: int,
    epochs: int,
    batch_size: int,
    learning_rate: float,
    n_embd: int = 128,
    n_head: int = 4
):
    """Experiment 2: Pre-LN ViT with residual connections + stable rank tracking."""
    db = SessionLocal()
    try:
        session = db.query(TrainingSession).filter(TrainingSession.id == session_id).first()
        if not session:
            return

        device = "cuda" if torch.cuda.is_available() else "cpu"

        model = Exp2ViT(
            num_layers=num_layers,
            num_heads=n_head,
            embed_dim=n_embd,
        )
        train_loader, test_loader = exp2_get_dataloader("cifar10", batch_size)

        model.to(device)
        criterion = nn.CrossEntropyLoss()
        optimizer = optim.AdamW(model.parameters(), lr=learning_rate)

        # Reset global step counter
        exp2_train_epoch._global_step = 0

        history = {
            "train_loss": [],
            "train_acc": [],
            "val_loss": [],
            "val_acc": [],
            "sr_per_layer": {},
            "sr_overall": [],
            "sr_steps": [],
            "current_epoch": 0,
            "total_epochs": epochs
        }

        for epoch in range(epochs):
            if is_cancelled(session_id):
                print(f"[Exp2 Session {session_id}] Cancelled at epoch {epoch}/{epochs}")
                session.training_history = dict(history)
                session.status = "cancelled"
                db.commit()
                cancelled_sessions.discard(session_id)
                return

            train_metrics = exp2_train_epoch(model, train_loader, criterion, optimizer, device, compute_sr=True, sr_interval=50)

            history["train_loss"].append(round(train_metrics["loss"], 4))
            history["train_acc"].append(round(train_metrics["accuracy"], 2))

            val_metrics = exp2_evaluate(model, test_loader, criterion, device)
            history["val_loss"].append(round(val_metrics["loss"], 4))
            history["val_acc"].append(round(val_metrics["accuracy"], 2))

            # Accumulate stable rank data
            for key, vals in train_metrics["sr_per_layer"].items():
                if key not in history["sr_per_layer"]:
                    history["sr_per_layer"][key] = []
                history["sr_per_layer"][key].extend(vals)
            history["sr_overall"].extend(train_metrics["sr_overall"])
            history["sr_steps"].extend(train_metrics["sr_steps"])

            history["current_epoch"] = epoch + 1

            print(f"[Exp2 Session {session_id}] Epoch {epoch+1}/{epochs} - "
                  f"Train Loss: {train_metrics['loss']:.4f}, Train Acc: {train_metrics['accuracy']:.2f}% - "
                  f"Val Loss: {val_metrics['loss']:.4f}, Val Acc: {val_metrics['accuracy']:.2f}%")

            session.training_history = dict(history)
            db.commit()

        # Training complete
        weights = model.get_weights()
        weights_serializable = {}
        for key, value in weights.items():
            if hasattr(value, 'tolist'):
                weights_serializable[key] = value.tolist()
            else:
                weights_serializable[key] = value

        session.weights = weights_serializable
        session.status = "completed"
        db.commit()

        cache_weights(session_id, weights_serializable)

    except Exception as e:
        session = db.query(TrainingSession).filter(TrainingSession.id == session_id).first()
        if session:
            session.status = "failed"
            db.commit()
        print(f"Exp2 Training failed: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


def train_and_store_weights_exp4(
    session_id: int,
    num_layers: int,
    epochs: int,
    batch_size: int,
    learning_rate: float,
    n_embd: int = 128,
    n_head: int = 4
):
    """Experiment 4: MTG-Inspired Attention ViT with stable rank tracking."""
    db = SessionLocal()
    try:
        session = db.query(TrainingSession).filter(TrainingSession.id == session_id).first()
        if not session:
            return

        device = "cuda" if torch.cuda.is_available() else "cpu"

        model = Exp4ViT(
            num_layers=num_layers,
            num_heads=n_head,
            embed_dim=n_embd,
        )
        train_loader, test_loader = exp4_get_dataloader("cifar10", batch_size)

        model.to(device)
        criterion = nn.CrossEntropyLoss()
        optimizer = optim.AdamW(model.parameters(), lr=learning_rate)

        # Reset global step counter
        exp4_train_epoch._global_step = 0

        history = {
            "train_loss": [],
            "train_acc": [],
            "val_loss": [],
            "val_acc": [],
            "sr_per_layer": {},
            "sr_overall": [],
            "sr_steps": [],
            "current_epoch": 0,
            "total_epochs": epochs
        }

        for epoch in range(epochs):
            if is_cancelled(session_id):
                print(f"[Exp4 Session {session_id}] Cancelled at epoch {epoch}/{epochs}")
                session.training_history = dict(history)
                session.status = "cancelled"
                db.commit()
                cancelled_sessions.discard(session_id)
                return

            train_metrics = exp4_train_epoch(model, train_loader, criterion, optimizer, device, compute_sr=True, sr_interval=50)

            history["train_loss"].append(round(train_metrics["loss"], 4))
            history["train_acc"].append(round(train_metrics["accuracy"], 2))

            val_metrics = exp4_evaluate(model, test_loader, criterion, device)
            history["val_loss"].append(round(val_metrics["loss"], 4))
            history["val_acc"].append(round(val_metrics["accuracy"], 2))

            # Accumulate stable rank data
            for key, vals in train_metrics["sr_per_layer"].items():
                if key not in history["sr_per_layer"]:
                    history["sr_per_layer"][key] = []
                history["sr_per_layer"][key].extend(vals)
            history["sr_overall"].extend(train_metrics["sr_overall"])
            history["sr_steps"].extend(train_metrics["sr_steps"])

            history["current_epoch"] = epoch + 1

            print(f"[Exp4 Session {session_id}] Epoch {epoch+1}/{epochs} - "
                  f"Train Loss: {train_metrics['loss']:.4f}, Train Acc: {train_metrics['accuracy']:.2f}% - "
                  f"Val Loss: {val_metrics['loss']:.4f}, Val Acc: {val_metrics['accuracy']:.2f}%")

            session.training_history = dict(history)
            db.commit()

        # Training complete
        weights = model.get_weights()
        weights_serializable = {}
        for key, value in weights.items():
            if hasattr(value, 'tolist'):
                weights_serializable[key] = value.tolist()
            else:
                weights_serializable[key] = value

        session.weights = weights_serializable
        session.status = "completed"
        db.commit()

        cache_weights(session_id, weights_serializable)

    except Exception as e:
        session = db.query(TrainingSession).filter(TrainingSession.id == session_id).first()
        if session:
            session.status = "failed"
            db.commit()
        print(f"Exp4 Training failed: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()
