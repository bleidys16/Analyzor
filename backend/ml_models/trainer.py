import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LinearRegression, LogisticRegression
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.neighbors import KNeighborsClassifier, KNeighborsRegressor
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, mean_absolute_error
import joblib
import os

class MLTrainer:
    """Entrena modelos ML automáticamente"""
    
    def __init__(self, csv_path: str):
        self.df = pd.read_csv(csv_path)
    
    def train(self, target_column: str, model_type: str = 'random_forest'):
        """Entrena un modelo"""
        
        # Preparar datos
        X = self.df.drop(columns=[target_column])
        y = self.df[target_column]
        
        # Convertir categóricas a numéricas si es necesario
        X = pd.get_dummies(X, drop_first=True)
        
        # Detectar si es clasificación o regresión
        is_classification = y.dtype == 'object' or len(y.unique()) < 10
        
        # Split
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        # Escalar
        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        X_test_scaled = scaler.transform(X_test)
        
        # Seleccionar modelo
        if model_type == 'linear_regression':
            model = LinearRegression()
        elif model_type == 'logistic_regression':
            model = LogisticRegression(max_iter=1000)
        elif model_type == 'random_forest':
            if is_classification:
                model = RandomForestClassifier(n_estimators=100, random_state=42)
            else:
                model = RandomForestRegressor(n_estimators=100, random_state=42)
        elif model_type == 'knn':
            if is_classification:
                model = KNeighborsClassifier(n_neighbors=5)
            else:
                model = KNeighborsRegressor(n_neighbors=5)
        
        # Entrenar
        model.fit(X_train_scaled, y_train)
        
        # Predecir
        y_pred = model.predict(X_test_scaled)
        
        # Métricas
        metrics = {}
        
        if is_classification:
            metrics['accuracy'] = float(accuracy_score(y_test, y_pred))
            metrics['precision'] = float(precision_score(y_test, y_pred, average='weighted', zero_division=0))
            metrics['recall'] = float(recall_score(y_test, y_pred, average='weighted', zero_division=0))
            metrics['f1_score'] = float(f1_score(y_test, y_pred, average='weighted', zero_division=0))
        else:
            metrics['mae'] = float(mean_absolute_error(y_test, y_pred))
            metrics['accuracy'] = None
            metrics['precision'] = None
            metrics['recall'] = None
            metrics['f1_score'] = None
        
        # Guardar modelo
        model_path = f'/tmp/model_{target_column}_{model_type}.pkl'
        joblib.dump({'model': model, 'scaler': scaler}, model_path)
        
        return {
            'model': model,
            'scaler': scaler,
            'model_path': model_path,
            'metrics': metrics,
            'features': list(X.columns),
            'is_classification': is_classification
        }