import os
import tempfile

import pandas as pd

df = pd.DataFrame(
    {
        "dates": pd.to_datetime(
            ["2023-01-01", "2023-02-01", "2023-03-01", "2023-04-01", "2023-05-01"]
        ),
    }
)
f = tempfile.NamedTemporaryFile(suffix=".csv", delete=False)
path = f.name
f.close()
df.to_csv(path, index=False)

print("=== parse_dates=True ===")
df3 = pd.read_csv(path, parse_dates=True)
print(df3["dates"].dtype)

print("=== parse_dates=['dates'] ===")
df4 = pd.read_csv(path, parse_dates=["dates"])
print(df4["dates"].dtype)

print("=== date_format='mixed' ===")
df5 = pd.read_csv(path, date_format="mixed")
print(df5["dates"].dtype)

os.unlink(path)
