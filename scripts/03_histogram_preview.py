import os
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

# Chemins relatifs à la racine du projet
root = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
csv_file = os.path.join(root, 'data_team', 'credit_card_fraud_2026_TEAM_v1.csv')  # shared team table
png_file = os.path.join(root, 'data_processed_hafid', 'hafid_histogram_preview.png')

if not os.path.exists(csv_file):
    print(f"ERROR: Cannot find {csv_file}. The team table must be in the 'data_team' folder.")
    exit()

# Only the columns needed for the histogram are read
df = pd.read_csv(csv_file, usecols=['amount_usd', 'is_fraud'])
normal = df[df['is_fraud'] == 0]['amount_usd']
fraud = df[df['is_fraud'] == 1]['amount_usd']

# Tranches régulières en échelle logarithmique (les montants vont de 1 $ à ~6 900 $)
bins = np.logspace(0, np.log10(df['amount_usd'].max()), 40)

fig, axes = plt.subplots(1, 2, figsize=(14, 5))
vues = [
    (False, "Nombre de transactions", "Vue 1 : en nombre (les fraudes sont à peine visibles)"),
    (True, "% de chaque groupe", "Vue 2 : en pourcentage (on compare les formes)"),
]

for ax, (en_pct, ylabel, titre) in zip(axes, vues):
    w_n = np.ones(len(normal)) * (100 / len(normal)) if en_pct else None
    w_f = np.ones(len(fraud)) * (100 / len(fraud)) if en_pct else None
    ax.hist(normal, bins=bins, weights=w_n, color='#2f6f9f', alpha=0.65, label=f'Normales ({len(normal):,})')
    ax.hist(fraud, bins=bins, weights=w_f, color='#d1345b', alpha=0.65, label=f'Fraudes ({len(fraud):,})')
    ax.axvline(normal.mean(), color='#2f6f9f', ls='--', lw=1.2)
    ax.axvline(fraud.mean(), color='#d1345b', ls='--', lw=1.2)
    ax.set_xscale('log')
    ax.set_xlabel('Montant (USD, échelle log)')
    ax.set_ylabel(ylabel)
    ax.set_title(titre, fontsize=11)
    ax.legend()

fig.suptitle(f"Distribution des montants : fraude vs normal (moyennes en pointillés : "
             f"{normal.mean():.0f} USD contre {fraud.mean():.0f} USD)", fontsize=13)
fig.tight_layout()
fig.savefig(png_file, dpi=150)
print(f"Image enregistrée : {png_file}")
plt.show()