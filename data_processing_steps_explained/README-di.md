# info-vizualisation
This directory contains scripts designed to evaluate the credit card fraud dataset (credit_card_fraud_2026.csv) and provide justification for attribute selection.

__This module does not modify csv file.__

Attribute importance is determined entirely through fraud rate calculations using the following approach:

__Base Rate__: Establishes the global baseline fraud percentage across the entire dataset.

__Categorical Attributes__: Computes the fraud rate for each subgroup, then selects the median value to represent the attribute's overall importance.

__Boolean Attributes__: Focuses specifically on the fraud rate associated with the true condition.

__Numeric Attributes__: Automatically bins continuous values into subsets first, calculates subgroup fraud rates, and then selects the median value.

<img width="2130" height="1198" alt="image" src="https://github.com/user-attachments/assets/fb620dfb-ae70-49dc-911f-d57aa52e727e" />
