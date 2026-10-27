import pandas as pd
import os

# Définition des chemins
script_dir = os.path.dirname(os.path.abspath(__file__))
input_dir = os.path.join(script_dir, '..', 'data_cleaned') 
output_dir = os.path.join(script_dir, '..', 'data_processed_hafid')

# Création du dossier de sortie 
os.makedirs(output_dir, exist_ok=True)

# Fichier d'entrée
clean_file = os.path.join(input_dir, 'credit_card_fraud_2026_CLEANED_v1.csv')

if not os.path.exists(clean_file):
    print(f"ERREUR: Impossible de trouver {clean_file}. Exécutez d'abord le script de nettoyage (01_data_cleaning.py).")
    exit()

# Chargement des données
print("Chargement des données nettoyées...")
df = pd.read_csv(clean_file)

print("\n--- ANALYSE STATISTIQUE DES MONTANTS (HAFID) ---")

# 1. Analyse par statut de fraude
mean_normal = df[df['is_fraud'] == False]['amount_usd'].mean()
mean_fraud = df[df['is_fraud'] == True]['amount_usd'].mean()

print(f"Moyenne globale Achats Normaux : {mean_normal:.2f} $")
print(f"Moyenne globale Fraudes        : {mean_fraud:.2f} $")

# 2. Analyse ciblée sur les achats à l'étranger
df_foreign = df[df['is_foreign_transaction'] == True]
foreign_fraud_rate = (df_foreign['is_fraud'].sum() / len(df_foreign)) * 100

df_local = df[df['is_foreign_transaction'] == False]
local_fraud_rate = (df_local['is_fraud'].sum() / len(df_local)) * 100

print("\n--- JUSTIFICATION DU FILTRE GÉOGRAPHIQUE ---")
print(f"Taux de fraude (National) : {local_fraud_rate:.2f}%")
print(f"Taux de fraude (Étranger) : {foreign_fraud_rate:.2f}% (X4 !)")

# 3. Ajout des colonnes calculées (Feature Engineering)
print("\n--- AJOUT DES COLONNES CALCULÉES ---")

# Colonne 1 : Tranche de montant pour l'histogramme D3.js
bins = [-1, 50, 150, 500, float('inf')]
labels = ['< $50', '$50 - $150', '$150 - $500', '> $500']
df['amount_category'] = pd.cut(df['amount_usd'], bins=bins, labels=labels)

# Colonne 2 : Ratio du montant par rapport à la moyenne des achats normaux
df['amount_to_mean_ratio'] = (df['amount_usd'] / mean_normal).round(2)

# Colonne 3 : Flag booléen pour les montants à haut risque (dépasse la moyenne des fraudes)
df['is_high_risk_amount'] = df['amount_usd'] >= mean_fraud

print("Colonnes ajoutées avec succès : 'amount_category', 'amount_to_mean_ratio', 'is_high_risk_amount'.")

# --- NOUVELLE ÉTAPE : FILTRAGE DES COLONNES ---
# On ne garde QUE les colonnes nécessaires pour la visualisation de Hiba
colonnes_a_garder = ['amount_usd', 'is_fraud', 'amount_category', 'amount_to_mean_ratio', 'is_high_risk_amount']
df = df[colonnes_a_garder]
print(f"Nettoyage final : Seules les colonnes utiles ont été conservées pour alléger le fichier.")

# 4. Sauvegarde du dataset complet enrichi
output_filename = os.path.join(output_dir, 'hafid_histogram_data.csv')
df.to_csv(output_filename, index=False)
print(f"\nSUCCESS: Dataset allégé et enrichi sauvegardé dans '{output_filename}'.")