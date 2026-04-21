from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import json
import os

from models.database import get_db, TrainingSession, User
from services.training import train_and_store_weights, train_and_store_weights_exp2, train_and_store_weights_exp3, train_and_store_weights_exp4, get_cached_weights, invalidate_cache, cancel_training
from api.auth import get_current_user, require_admin

router = APIRouter()

class TrainingRequest(BaseModel):
    dataset: str
    num_layers: int
    n_embd: int = 128
    n_head: int = 4
    epochs: int = 10
    batch_size: int = 32
    learning_rate: float = 0.001
    attention_type: str = "residual"

class TrainingResponse(BaseModel):
    session_id: int
    status: str
    message: str

@router.post("/train", response_model=TrainingResponse)
async def train_network(
    request: TrainingRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if request.dataset not in ["cifar10", "mnist"]:
        raise HTTPException(status_code=400, detail="Invalid dataset. Use 'cifar10' or 'mnist'")
    
    if request.num_layers < 1 or request.num_layers > 10:
        raise HTTPException(status_code=400, detail="Number of layers must be between 1 and 10")
    
    if request.attention_type not in ["vanilla", "residual"]:
        raise HTTPException(status_code=400, detail="Invalid attention_type. Use 'vanilla' or 'residual'")
    
    session = TrainingSession(
        dataset=request.dataset,
        num_layers=request.num_layers,
        n_embd=request.n_embd,
        n_head=request.n_head,
        epochs=request.epochs,
        batch_size=request.batch_size,
        learning_rate=request.learning_rate,
        status="training"
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    
    invalidate_cache(session.id)
    
    background_tasks.add_task(
        train_and_store_weights,
        session_id=session.id,
        dataset=request.dataset,
        num_layers=request.num_layers,
        epochs=request.epochs,
        batch_size=request.batch_size,
        learning_rate=request.learning_rate,
        attention_type=request.attention_type,
        n_embd=request.n_embd,
        n_head=request.n_head
    )
    
    return TrainingResponse(
        session_id=session.id,
        status="training",
        message=f"Training started for {request.dataset} with {request.num_layers} attention layers"
    )


class Exp2TrainingRequest(BaseModel):
    num_layers: int
    n_embd: int = 128
    n_head: int = 4
    epochs: int = 10
    batch_size: int = 32
    learning_rate: float = 0.001


@router.post("/train/exp2", response_model=TrainingResponse)
async def train_exp2(
    request: Exp2TrainingRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    session = TrainingSession(
        dataset="cifar10",
        num_layers=request.num_layers,
        n_embd=request.n_embd,
        n_head=request.n_head,
        epochs=request.epochs,
        batch_size=request.batch_size,
        learning_rate=request.learning_rate,
        status="training"
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    invalidate_cache(session.id)

    background_tasks.add_task(
        train_and_store_weights_exp2,
        session_id=session.id,
        num_layers=request.num_layers,
        epochs=request.epochs,
        batch_size=request.batch_size,
        learning_rate=request.learning_rate,
        n_embd=request.n_embd,
        n_head=request.n_head
    )

    return TrainingResponse(
        session_id=session.id,
        status="training",
        message=f"Exp2 training started: augmented CIFAR10, cosine annealing, {request.num_layers} layers"
    )


class Exp3TrainingRequest(BaseModel):
    num_layers: int
    n_embd: int = 128
    n_head: int = 4
    epochs: int = 10
    batch_size: int = 32
    learning_rate: float = 0.001


@router.post("/train/exp3", response_model=TrainingResponse)
async def train_exp3(
    request: Exp3TrainingRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    session = TrainingSession(
        dataset="cifar10",
        num_layers=request.num_layers,
        n_embd=request.n_embd,
        n_head=request.n_head,
        epochs=request.epochs,
        batch_size=request.batch_size,
        learning_rate=request.learning_rate,
        status="training"
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    invalidate_cache(session.id)

    background_tasks.add_task(
        train_and_store_weights_exp3,
        session_id=session.id,
        num_layers=request.num_layers,
        epochs=request.epochs,
        batch_size=request.batch_size,
        learning_rate=request.learning_rate,
        n_embd=request.n_embd,
        n_head=request.n_head
    )

    return TrainingResponse(
        session_id=session.id,
        status="training",
        message=f"Exp3 training started: warmup + dropout, {request.num_layers} layers"
    )


class Exp4TrainingRequest(BaseModel):
    num_layers: int
    n_embd: int = 128
    n_head: int = 4
    epochs: int = 10
    batch_size: int = 32
    learning_rate: float = 0.001


@router.post("/train/exp4", response_model=TrainingResponse)
async def train_exp4(
    request: Exp4TrainingRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    session = TrainingSession(
        dataset="cifar10",
        num_layers=request.num_layers,
        n_embd=request.n_embd,
        n_head=request.n_head,
        epochs=request.epochs,
        batch_size=request.batch_size,
        learning_rate=request.learning_rate,
        status="training"
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    invalidate_cache(session.id)

    background_tasks.add_task(
        train_and_store_weights_exp4,
        session_id=session.id,
        num_layers=request.num_layers,
        epochs=request.epochs,
        batch_size=request.batch_size,
        learning_rate=request.learning_rate,
        n_embd=request.n_embd,
        n_head=request.n_head
    )

    return TrainingResponse(
        session_id=session.id,
        status="training",
        message=f"Exp4 training started: all enhancements, {request.num_layers} layers"
    )

@router.get("/exp5/data")
async def get_exp5_data(current_user: User = Depends(get_current_user)):
    """Return pre-computed stable rank data for all 4 attention types."""
    data_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
    attention_types = ["vanilla", "residual", "differential", "mind_the_gap"]
    result = {}

    for atype in attention_types:
        filepath = os.path.join(data_dir, f"exp5_{atype}.json")
        if os.path.exists(filepath):
            with open(filepath, "r") as f:
                result[atype] = json.load(f)
        else:
            result[atype] = None

    return result

@router.get("/weights/{session_id}")
async def get_weights(session_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    cached_weights = get_cached_weights(session_id)
    if cached_weights is not None:
        return {"session_id": session_id, "weights": cached_weights, "cached": True}
    
    session = db.query(TrainingSession).filter(TrainingSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Training session not found")
    
    if session.status != "completed":
        raise HTTPException(status_code=400, detail=f"Training {session.status}")
    
    weights = session.weights
    if weights:
        weights = convert_weights_for_json(weights)
    
    return {"session_id": session_id, "weights": weights, "cached": False}

@router.get("/weights/{session_id}/layer/{layer_idx}")
async def get_layer_weights(session_id: int, layer_idx: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    session = db.query(TrainingSession).filter(TrainingSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Training session not found")
    
    if session.status != "completed":
        raise HTTPException(status_code=400, detail=f"Training {session.status}")
    
    if not session.weights:
        raise HTTPException(status_code=404, detail="No weights found")
    
    layer_weights = get_layer_weights_by_index(session.weights, layer_idx, session.num_layers)
    return {"session_id": session_id, "layer_idx": layer_idx, "weights": layer_weights}

@router.get("/sessions")
async def list_sessions(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    sessions = db.query(TrainingSession).order_by(TrainingSession.created_at.desc()).all()
    return {"sessions": [s.to_dict() for s in sessions]}

@router.get("/sessions/{session_id}")
async def get_session(session_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    session = db.query(TrainingSession).filter(TrainingSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Training session not found")
    return session.to_dict()

@router.get("/sessions/{session_id}/progress")
async def get_session_progress(session_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    session = db.query(TrainingSession).filter(TrainingSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Training session not found")
    
    history = session.training_history or {}
    current_epoch = history.get("current_epoch", 0)
    total_epochs = history.get("total_epochs", 0)
    
    train_loss_list = history.get("train_loss", [])
    train_acc_list = history.get("train_acc", [])
    val_loss_list = history.get("val_loss", [])
    val_acc_list = history.get("val_acc", [])
    val_error_list = [round(100.0 - a, 2) for a in val_acc_list]
    
    return {
        "session_id": session_id,
        "status": session.status,
        "current_epoch": current_epoch,
        "total_epochs": total_epochs,
        "train_loss": train_loss_list,
        "train_acc": train_acc_list,
        "val_loss": val_loss_list,
        "top1_accuracy": val_acc_list,
        "val_error": val_error_list,
        "sr_per_layer": history.get("sr_per_layer", {}),
        "sr_overall": history.get("sr_overall", []),
        "sr_steps": history.get("sr_steps", []),
    }

@router.post("/sessions/{session_id}/cancel")
async def cancel_session_training(session_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    session = db.query(TrainingSession).filter(TrainingSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Training session not found")
    if session.status != "training":
        raise HTTPException(status_code=400, detail=f"Session is not training (status: {session.status})")
    cancel_training(session_id)
    return {"message": "Cancel signal sent", "session_id": session_id}

@router.get("/sessions/{session_id}/metrics")
async def get_session_metrics(session_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    session = db.query(TrainingSession).filter(TrainingSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Training session not found")
    
    if session.status != "completed":
        raise HTTPException(status_code=400, detail=f"Training {session.status}")
    
    history = session.training_history
    if not history:
        raise HTTPException(status_code=404, detail="No training history found")
    
    train_loss = history.get("train_loss", [])[-1] if history.get("train_loss") else None
    val_acc = history.get("val_acc", [])[-1] if history.get("val_acc") else None
    val_error = round(100.0 - val_acc, 2) if val_acc is not None else None
    
    return {
        "session_id": session_id,
        "training_loss": round(train_loss, 4) if train_loss is not None else None,
        "top1_accuracy": round(val_acc, 2) if val_acc is not None else None,
        "val_error": val_error,
        "full_history": history
    }

def convert_weights_for_json(weights):
    if isinstance(weights, dict):
        result = {}
        for key, value in weights.items():
            if isinstance(value, (list, tuple)):
                result[key] = [float(v) for v in value]
            elif hasattr(value, 'tolist'):
                result[key] = value.tolist()
            else:
                result[key] = value
        return result
    return weights

def get_layer_weights_by_index(weights: Dict, layer_idx: int, total_layers: int) -> Dict:
    layer_weights = {}
    attention_prefix = f"attention_layers.{layer_idx}."
    
    for key, value in weights.items():
        if attention_prefix in key:
            layer_key = key.replace(attention_prefix, "")
            if hasattr(value, 'tolist'):
                layer_weights[layer_key] = value.tolist()
            else:
                layer_weights[layer_key] = value
    
    if layer_idx == 0:
        for key, value in weights.items():
            if "conv" in key or "bn" in key or "fc_in" in key or "fc_out" in key:
                if hasattr(value, 'tolist'):
                    layer_weights[key] = value.tolist()
                else:
                    layer_weights[key] = value
    
    return layer_weights
