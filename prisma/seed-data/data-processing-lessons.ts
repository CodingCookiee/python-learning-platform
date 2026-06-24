type LessonSeed = {
  title: string;
  description: string;
  content: string;
  order: number;
  estimatedTime: number;
  moduleTitle: string;
};

export const dataProcessingLessons: LessonSeed[] = [
  {
    moduleTitle: "Data Processing",
    title: "NumPy Fundamentals",
    description: "Master NumPy for numerical computing, work with arrays, perform vectorized operations, and understand array manipulation techniques.",
    order: 1,
    estimatedTime: 35,
    content: `# NumPy Fundamentals

## Why This Matters
NumPy is the foundation of scientific computing in Python. It provides fast, efficient array operations that are essential for data science, machine learning, and numerical analysis.

## What You Will Learn
- NumPy array basics
- Array creation and indexing
- Vectorized operations
- Array manipulation and reshaping
- Mathematical operations
- Broadcasting rules

---

## Installing NumPy

### Setup

\`\`\`bash
pip install numpy
\`\`\`

---

## NumPy Arrays

### Creating Arrays

\`\`\`python
import numpy as np

# From list
arr = np.array([1, 2, 3, 4, 5])
print(arr)  # [1 2 3 4 5]

# 2D array
arr_2d = np.array([[1, 2, 3], [4, 5, 6]])
print(arr_2d)
# [[1 2 3]
#  [4 5 6]]

# Array with specific dtype
arr_float = np.array([1, 2, 3], dtype=np.float64)
print(arr_float)  # [1. 2. 3.]
\`\`\`

### Array Creation Functions

\`\`\`python
# Zeros
zeros = np.zeros((3, 4))  # 3x4 array of zeros

# Ones
ones = np.ones((2, 3))  # 2x3 array of ones

# Empty (uninitialized)
empty = np.empty((2, 2))

# Range
range_arr = np.arange(0, 10, 2)  # [0 2 4 6 8]

# Linspace
linear = np.linspace(0, 1, 5)  # [0.   0.25 0.5  0.75 1.  ]

# Identity matrix
identity = np.eye(3)  # 3x3 identity matrix

# Random arrays
random = np.random.rand(3, 3)  # 3x3 random values from 0 to 1
random_int = np.random.randint(0, 10, size=(2, 3))  # Random integers
\`\`\`

---

## Array Attributes

\`\`\`python
arr = np.array([[1, 2, 3], [4, 5, 6]])

print(arr.shape)    # (2, 3) - dimensions
print(arr.dtype)    # int64 - data type
print(arr.size)     # 6 - total elements
print(arr.ndim)     # 2 - number of dimensions
print(arr.itemsize) # 8 - bytes per element
\`\`\`

---

## Indexing and Slicing

### Basic Indexing

\`\`\`python
arr = np.array([10, 20, 30, 40, 50])

# Single element
print(arr[0])    # 10
print(arr[-1])   # 50

# Slicing
print(arr[1:4])  # [20 30 40]
print(arr[:3])   # [10 20 30]
print(arr[2:])   # [30 40 50]
\`\`\`

### Two-Dimensional Indexing

\`\`\`python
arr_2d = np.array([[1, 2, 3], [4, 5, 6], [7, 8, 9]])

# Single element
print(arr_2d[0, 0])  # 1
print(arr_2d[1, 2])  # 6

# Slicing
print(arr_2d[:2, :2])
# [[1 2]
#  [4 5]]

# Row
print(arr_2d[1, :])  # [4 5 6]

# Column
print(arr_2d[:, 1])  # [2 5 8]
\`\`\`

### Boolean Indexing

\`\`\`python
arr = np.array([1, 2, 3, 4, 5])

# Boolean mask
mask = arr > 3
print(mask)  # [False False False  True  True]

# Filter array
print(arr[mask])  # [4 5]

# In one line
print(arr[arr > 3])  # [4 5]
print(arr[(arr > 2) & (arr < 5)])  # [3 4]
\`\`\`

### Fancy Indexing

\`\`\`python
arr = np.array([10, 20, 30, 40, 50])

# Index with array
indices = np.array([0, 2, 4])
print(arr[indices])  # [10 30 50]

# 2D fancy indexing
arr_2d = np.array([[1, 2, 3], [4, 5, 6], [7, 8, 9]])
print(arr_2d[[0, 2], [0, 2]])  # [1 9]
\`\`\`

---

## Vectorized Operations

### Arithmetic Operations

\`\`\`python
arr1 = np.array([1, 2, 3, 4])
arr2 = np.array([10, 20, 30, 40])

# Element-wise operations
print(arr1 + arr2)  # [11 22 33 44]
print(arr1 - arr2)  # [-9 -18 -27 -36]
print(arr1 * arr2)  # [10 40 90 160]
print(arr1 / arr2)  # [0.1 0.1 0.1 0.1]

# With scalar
print(arr1 * 2)     # [2 4 6 8]
print(arr1 + 10)    # [11 12 13 14]
\`\`\`

### Comparison Operations

\`\`\`python
arr = np.array([1, 2, 3, 4, 5])

print(arr > 3)      # [False False False  True  True]
print(arr == 3)     # [False False  True False False]
print(arr <= 2)     # [ True  True False False False]
\`\`\`

---

## Mathematical Functions

### Universal Functions (ufuncs)

\`\`\`python
arr = np.array([1, 2, 3, 4])

# Square root
print(np.sqrt(arr))  # [1. 1.41421356 1.73205081 2.]

# Exponential
print(np.exp(arr))   # [ 2.71828183  7.3890561  20.08553692 54.59815003]

# Logarithm
print(np.log(arr))   # [0. 0.69314718 1.09861229 1.38629436]

# Trigonometry
angles = np.array([0, np.pi/2, np.pi])
print(np.sin(angles))  # [0.0000000e+00 1.0000000e+00 1.2246468e-16]
print(np.cos(angles))  # [ 1.000000e+00  6.123234e-17 -1.000000e+00]
\`\`\`

### Aggregate Functions

\`\`\`python
arr = np.array([1, 2, 3, 4, 5])

print(np.sum(arr))      # 15
print(np.mean(arr))     # 3.0
print(np.std(arr))      # 1.4142135623730951
print(np.min(arr))      # 1
print(np.max(arr))      # 5
print(np.median(arr))   # 3.0

# With 2D arrays
arr_2d = np.array([[1, 2, 3], [4, 5, 6]])

print(np.sum(arr_2d, axis=0))   # [5 7 9] - column sums
print(np.sum(arr_2d, axis=1))   # [6 15] - row sums
print(np.mean(arr_2d, axis=0))  # [2.5 3.5 4.5]
\`\`\`

---

## Array Manipulation

### Reshaping

\`\`\`python
arr = np.arange(12)  # [0 1 2 3 4 5 6 7 8 9 10 11]

# Reshape to 2D
reshaped = arr.reshape(3, 4)
print(reshaped)
# [[ 0  1  2  3]
#  [ 4  5  6  7]
#  [ 8  9 10 11]]

# Flatten
flattened = reshaped.flatten()
print(flattened)  # [0 1 2 3 4 5 6 7 8 9 10 11]

# Ravel (returns view)
raveled = reshaped.ravel()
\`\`\`

### Transposing

\`\`\`python
arr = np.array([[1, 2, 3], [4, 5, 6]])

transposed = arr.T
print(transposed)
# [[1 4]
#  [2 5]
#  [3 6]]
\`\`\`

### Stacking

\`\`\`python
arr1 = np.array([1, 2, 3])
arr2 = np.array([4, 5, 6])

# Vertical stack
vstacked = np.vstack([arr1, arr2])
print(vstacked)
# [[1 2 3]
#  [4 5 6]]

# Horizontal stack
hstacked = np.hstack([arr1, arr2])
print(hstacked)  # [1 2 3 4 5 6]

# Concatenate
concatenated = np.concatenate([arr1, arr2])
print(concatenated)  # [1 2 3 4 5 6]
\`\`\`

### Splitting

\`\`\`python
arr = np.arange(9)

# Split into 3 parts
split = np.split(arr, 3)
print(split)  # [array([0, 1, 2]), array([3, 4, 5]), array([6, 7, 8])]

# 2D split
arr_2d = np.arange(12).reshape(3, 4)
vsplit = np.vsplit(arr_2d, 3)  # Split rows
hsplit = np.hsplit(arr_2d, 2)  # Split columns
\`\`\`

---

## Broadcasting

### Broadcasting Rules

\`\`\`python
# Scalar broadcasting
arr = np.array([1, 2, 3])
result = arr + 10  # [11 12 13]

# 1D to 2D broadcasting
arr_2d = np.array([[1, 2, 3], [4, 5, 6]])
arr_1d = np.array([10, 20, 30])

result = arr_2d + arr_1d
print(result)
# [[11 22 33]
#  [14 25 36]]

# Column broadcasting
col = np.array([[1], [2], [3]])
row = np.array([10, 20, 30])

result = col + row
print(result)
# [[11 21 31]
#  [12 22 32]
#  [13 23 33]]
\`\`\`

---

## Linear Algebra

\`\`\`python
# Matrix multiplication
a = np.array([[1, 2], [3, 4]])
b = np.array([[5, 6], [7, 8]])

# Dot product
result = np.dot(a, b)
# or
result = a @ b
print(result)
# [[19 22]
#  [43 50]]

# Matrix inverse
inv = np.linalg.inv(a)

# Determinant
det = np.linalg.det(a)

# Eigenvalues and eigenvectors
eigenvalues, eigenvectors = np.linalg.eig(a)
\`\`\`

---

## Real-World Example: Data Analysis

\`\`\`python
import numpy as np

# Simulate sales data (days x products)
sales = np.random.randint(10, 100, size=(30, 5))

# Calculate statistics
total_sales = np.sum(sales)
daily_totals = np.sum(sales, axis=1)
product_totals = np.sum(sales, axis=0)

average_daily = np.mean(daily_totals)
best_day = np.argmax(daily_totals)
worst_day = np.argmin(daily_totals)

print(f"Total sales: {total_sales}")
print(f"Average daily sales: {average_daily:.2f}")
print(f"Best selling day: Day {best_day + 1}")
print(f"Product totals: {product_totals}")

# Find days with sales > 200
high_sales_days = np.where(daily_totals > 200)[0]
print(f"High sales days: {high_sales_days + 1}")

# Normalize data (0-1 range)
normalized = (sales - sales.min()) / (sales.max() - sales.min())
print(f"Normalized sales range: {normalized.min():.2f} to {normalized.max():.2f}")
\`\`\`

---

## Common Pitfalls

### Pitfall 1: Views vs Copies

\`\`\`python
# Bad: Modifying view affects original
arr = np.array([1, 2, 3, 4, 5])
view = arr[1:4]
view[0] = 999
print(arr)  # [1 999 3 4 5] - Original changed!

# Good: Make explicit copy
arr = np.array([1, 2, 3, 4, 5])
copy = arr[1:4].copy()
copy[0] = 999
print(arr)  # [1 2 3 4 5] - Original unchanged
\`\`\`

### Pitfall 2: Broadcasting Confusion

\`\`\`python
# Bad: Incompatible shapes
arr1 = np.array([[1, 2, 3], [4, 5, 6]])  # (2, 3)
arr2 = np.array([1, 2])                   # (2,)
# arr1 + arr2  # ValueError!

# Good: Reshape for broadcasting
arr1 = np.array([[1, 2, 3], [4, 5, 6]])
arr2 = np.array([[1], [2]])  # (2, 1)
result = arr1 + arr2  # Works!
\`\`\`

---

## Quick Practice

1. Create arrays with different methods
2. Perform vectorized operations
3. Reshape and manipulate arrays

**Solution:**
\`\`\`python
import numpy as np

# Create arrays
arr1 = np.arange(12)
arr2 = np.linspace(0, 10, 12)

# Reshape
matrix = arr1.reshape(3, 4)

# Operations
squared = arr1 ** 2
filtered = arr1[arr1 > 5]

# Statistics
print(f"Mean: {np.mean(arr1)}")
print(f"Std: {np.std(arr1)}")
print(f"Sum by row: {np.sum(matrix, axis=1)}")

# Broadcasting
result = matrix + np.array([1, 2, 3, 4])
print(result)
\`\`\`

---

## Key Takeaways

- NumPy provides fast array operations
- Arrays are homogeneous and fixed-size
- Vectorized operations avoid loops
- Broadcasting enables operations on different shapes
- Use axis parameter for multi-dimensional operations
- Views share memory, copies don't
- Universal functions (ufuncs) operate element-wise
- Linear algebra operations built-in
- Essential for data science and ML
- Much faster than Python lists for numerical operations

---

**Next Lesson:** Pandas for Data Manipulation!
`
  },
  {
    moduleTitle: "Data Processing",
    title: "Pandas for Data Manipulation",
    description: "Master Pandas for data manipulation, work with DataFrames and Series, perform data cleaning, filtering, grouping, and merging operations.",
    order: 2,
    estimatedTime: 35,
    content: `# Pandas for Data Manipulation

## Why This Matters
Pandas is the most popular library for data manipulation and analysis in Python. It provides powerful tools for working with structured data, making data cleaning and transformation simple and efficient.

## What You Will Learn
- DataFrames and Series
- Reading and writing data
- Data selection and filtering
- Data cleaning and transformation
- Grouping and aggregation
- Merging and joining datasets

---

## Installing Pandas

### Setup

\`\`\`bash
pip install pandas
\`\`\`

---

## Series and DataFrames

### Series (1D)

\`\`\`python
import pandas as pd
import numpy as np

# Create Series
s = pd.Series([1, 2, 3, 4, 5])
print(s)
# 0    1
# 1    2
# 2    3
# 3    4
# 4    5

# Series with custom index
s = pd.Series([10, 20, 30], index=['a', 'b', 'c'])
print(s['a'])  # 10

# From dictionary
data = {'a': 100, 'b': 200, 'c': 300}
s = pd.Series(data)
\`\`\`

### DataFrame (Two-Dimensional)

\`\`\`python
# Create DataFrame from dictionary
data = {
    'name': ['Alice', 'Bob', 'Charlie'],
    'age': [25, 30, 35],
    'city': ['New York', 'Paris', 'London']
}
df = pd.DataFrame(data)
print(df)
#       name  age      city
# 0    Alice   25  New York
# 1      Bob   30     Paris
# 2  Charlie   35    London

# From list of dictionaries
data = [
    {'name': 'Alice', 'age': 25},
    {'name': 'Bob', 'age': 30}
]
df = pd.DataFrame(data)

# From NumPy array
arr = np.array([[1, 2, 3], [4, 5, 6]])
df = pd.DataFrame(arr, columns=['A', 'B', 'C'])
\`\`\`

---

## Reading and Writing Data

### Reading Files

\`\`\`python
# CSV
df = pd.read_csv('data.csv')
df = pd.read_csv('data.csv', index_col=0)  # Use first column as index

# Excel
df = pd.read_excel('data.xlsx', sheet_name='Sheet1')

# JSON
df = pd.read_json('data.json')

# SQL
import sqlite3
conn = sqlite3.connect('database.db')
df = pd.read_sql_query('SELECT * FROM users', conn)
\`\`\`

### Writing Files

\`\`\`python
# CSV
df.to_csv('output.csv', index=False)

# Excel
df.to_excel('output.xlsx', index=False)

# JSON
df.to_json('output.json', orient='records')
\`\`\`

---

## DataFrame Basics

### Inspecting Data

\`\`\`python
df = pd.read_csv('data.csv')

# First/last rows
print(df.head())     # First 5 rows
print(df.tail(3))    # Last 3 rows

# Shape and info
print(df.shape)      # (rows, columns)
print(df.columns)    # Column names
print(df.dtypes)     # Data types
print(df.info())     # Summary info

# Statistics
print(df.describe()) # Statistical summary
\`\`\`

---

## Data Selection

### Selecting Columns

\`\`\`python
df = pd.DataFrame({
    'name': ['Alice', 'Bob', 'Charlie'],
    'age': [25, 30, 35],
    'salary': [50000, 60000, 70000]
})

# Single column (returns Series)
names = df['name']

# Multiple columns (returns DataFrame)
subset = df[['name', 'age']]
\`\`\`

### Selecting Rows

\`\`\`python
# By index (iloc)
first_row = df.iloc[0]        # First row
first_two = df.iloc[0:2]      # First two rows
specific = df.iloc[[0, 2]]    # Rows 0 and 2

# By label (loc)
row = df.loc[0]               # Row with index 0
rows = df.loc[0:2]            # Rows 0 to 2 (inclusive)

# Specific cells
value = df.iloc[0, 1]         # Row 0, column 1
value = df.loc[0, 'age']      # Row 0, 'age' column
\`\`\`

### Boolean Indexing

\`\`\`python
# Filter rows
older_than_25 = df[df['age'] > 25]
high_earners = df[df['salary'] >= 60000]

# Multiple conditions
filtered = df[(df['age'] > 25) & (df['salary'] < 70000)]

# Using isin()
selected = df[df['name'].isin(['Alice', 'Bob'])]
\`\`\`

---

## Data Cleaning

### Handling Missing Data

\`\`\`python
df = pd.DataFrame({
    'A': [1, 2, np.nan, 4],
    'B': [5, np.nan, np.nan, 8],
    'C': [9, 10, 11, 12]
})

# Check for missing values
print(df.isnull())          # Boolean mask
print(df.isnull().sum())    # Count per column

# Drop missing values
df_dropped = df.dropna()              # Drop rows with any NaN
df_dropped = df.dropna(axis=1)        # Drop columns with any NaN
df_dropped = df.dropna(thresh=2)      # Keep rows with at least 2 non-NaN

# Fill missing values
df_filled = df.fillna(0)              # Fill with 0
df_filled = df.fillna(df.mean())      # Fill with mean
df_filled = df.fillna(method='ffill') # Forward fill
df_filled = df.fillna(method='bfill') # Backward fill
\`\`\`

### Removing Duplicates

\`\`\`python
df = pd.DataFrame({
    'A': [1, 1, 2, 3],
    'B': [4, 4, 5, 6]
})

# Check duplicates
print(df.duplicated())        # Boolean mask
print(df.duplicated().sum())  # Count

# Remove duplicates
df_unique = df.drop_duplicates()
df_unique = df.drop_duplicates(subset=['A'])  # Based on column A
\`\`\`

---

## Data Transformation

### Adding/Removing Columns

\`\`\`python
df = pd.DataFrame({
    'name': ['Alice', 'Bob'],
    'age': [25, 30]
})

# Add column
df['salary'] = [50000, 60000]
df['bonus'] = df['salary'] * 0.1

# Remove column
df = df.drop('bonus', axis=1)
# or
df = df.drop(columns=['bonus'])
\`\`\`

### Applying Functions

\`\`\`python
# Apply to column
df['age_squared'] = df['age'].apply(lambda x: x ** 2)

# Apply to row
df['sum'] = df.apply(lambda row: row['age'] + row['salary'], axis=1)

# Map values
df['category'] = df['age'].map({25: 'young', 30: 'adult'})
\`\`\`

### String Operations

\`\`\`python
df = pd.DataFrame({'name': ['alice', 'bob', 'charlie']})

# String methods
df['upper'] = df['name'].str.upper()
df['length'] = df['name'].str.len()
df['starts_with_a'] = df['name'].str.startswith('a')
df['contains'] = df['name'].str.contains('li')
\`\`\`

---

## Grouping and Aggregation

### GroupBy

\`\`\`python
df = pd.DataFrame({
    'department': ['IT', 'HR', 'IT', 'HR', 'IT'],
    'name': ['Alice', 'Bob', 'Charlie', 'David', 'Eve'],
    'salary': [50000, 45000, 55000, 48000, 52000]
})

# Group by and aggregate
avg_salary = df.groupby('department')['salary'].mean()
print(avg_salary)
# department
# HR    46500.0
# IT    52333.333333

# Multiple aggregations
agg = df.groupby('department')['salary'].agg(['mean', 'min', 'max'])
print(agg)
\`\`\`

### Pivot Tables

\`\`\`python
df = pd.DataFrame({
    'date': ['2024-01-01', '2024-01-01', '2024-01-02', '2024-01-02'],
    'product': ['A', 'B', 'A', 'B'],
    'sales': [100, 150, 120, 180]
})

pivot = df.pivot_table(
    values='sales',
    index='date',
    columns='product',
    aggfunc='sum'
)
print(pivot)
\`\`\`

---

## Merging and Joining

### Merge

\`\`\`python
df1 = pd.DataFrame({
    'id': [1, 2, 3],
    'name': ['Alice', 'Bob', 'Charlie']
})

df2 = pd.DataFrame({
    'id': [1, 2, 4],
    'salary': [50000, 60000, 70000]
})

# Inner join
merged = pd.merge(df1, df2, on='id')

# Left join
merged = pd.merge(df1, df2, on='id', how='left')

# Right join
merged = pd.merge(df1, df2, on='id', how='right')

# Outer join
merged = pd.merge(df1, df2, on='id', how='outer')
\`\`\`

### Concatenate

\`\`\`python
df1 = pd.DataFrame({'A': [1, 2], 'B': [3, 4]})
df2 = pd.DataFrame({'A': [5, 6], 'B': [7, 8]})

# Vertical concatenation
result = pd.concat([df1, df2], ignore_index=True)

# Horizontal concatenation
result = pd.concat([df1, df2], axis=1)
\`\`\`

---

## Real-World Example: Sales Analysis

\`\`\`python
import pandas as pd
import numpy as np

# Sample sales data
df = pd.DataFrame({
    'date': pd.date_range('2024-01-01', periods=100),
    'product': np.random.choice(['A', 'B', 'C'], 100),
    'quantity': np.random.randint(1, 10, 100),
    'price': np.random.randint(10, 100, 100)
})

# Add calculated column
df['revenue'] = df['quantity'] * df['price']

# Convert date to datetime
df['date'] = pd.to_datetime(df['date'])
df['month'] = df['date'].dt.month
df['day_name'] = df['date'].dt.day_name()

# Summary statistics
print("Total Revenue:", df['revenue'].sum())
print("Average Revenue:", df['revenue'].mean())

# Group by product
product_summary = df.groupby('product').agg({
    'quantity': 'sum',
    'revenue': ['sum', 'mean']
})
print(product_summary)

# Monthly revenue
monthly = df.groupby('month')['revenue'].sum()
print(monthly)

# Best selling product
best_product = df.groupby('product')['revenue'].sum().idxmax()
print(f"Best selling product: {best_product}")

# Filter high value transactions
high_value = df[df['revenue'] > 500]
print(f"High value transactions: {len(high_value)}")
\`\`\`

---

## Common Pitfalls

### Pitfall 1: Chained Indexing

\`\`\`python
# Bad: Chained indexing
df[df['age'] > 25]['salary'] = 70000  # Warning!

# Good: Use loc
df.loc[df['age'] > 25, 'salary'] = 70000
\`\`\`

### Pitfall 2: Forgetting inplace

\`\`\`python
# Bad: Doesn't modify original
df.dropna()
print(df)  # Still has NaN values

# Good: Assign result or use inplace
df = df.dropna()
# or
df.dropna(inplace=True)
\`\`\`

---

## Quick Practice

1. Create a DataFrame
2. Filter and transform data
3. Group and aggregate

**Solution:**
\`\`\`python
import pandas as pd
import numpy as np

# Create DataFrame
df = pd.DataFrame({
    'employee': ['Alice', 'Bob', 'Charlie', 'David', 'Eve'],
    'department': ['IT', 'HR', 'IT', 'HR', 'IT'],
    'salary': [50000, 45000, 55000, 48000, 52000],
    'years': [2, 5, 3, 4, 1]
})

# Add bonus column
df['bonus'] = df['salary'] * 0.1

# Filter IT department
it_dept = df[df['department'] == 'IT']

# Group by department
dept_stats = df.groupby('department').agg({
    'salary': ['mean', 'max'],
    'years': 'mean'
})
print(dept_stats)

# Sort by salary
df_sorted = df.sort_values('salary', ascending=False)
print(df_sorted.head())
\`\`\`

---

## Key Takeaways

- Pandas provides DataFrames for structured data
- Use read_csv, read_excel for loading data
- iloc for position-based indexing, loc for label-based
- Boolean indexing for filtering
- dropna and fillna for missing values
- groupby for aggregations
- merge and concat for combining datasets
- apply and map for transformations
- Always use loc to avoid chained indexing warnings
- Essential for data analysis and preprocessing

---

**Next Lesson:** Data Visualization with Matplotlib and Seaborn!
`
  },
  {
    moduleTitle: "Data Processing",
    title: "Data Visualization with Matplotlib",
    description: "Create data visualizations with Matplotlib, master plotting basics, customize charts, and create publication-quality figures.",
    order: 3,
    estimatedTime: 35,
    content: `# Data Visualization with Matplotlib

## Why This Matters
Data visualization is essential for understanding patterns, communicating insights, and making data-driven decisions. Matplotlib is Python's foundational plotting library used by data scientists worldwide.

## What You Will Learn
- Creating basic plots (line, bar, scatter)
- Customizing plot appearance
- Multiple subplots
- Working with figures and axes
- Saving and exporting plots
- Best practices for data visualization

---

## Installing Matplotlib

### Setup

\`\`\`bash
pip install matplotlib
\`\`\`

---

## Basic Plotting

### Line Plot

\`\`\`python
import matplotlib.pyplot as plt
import numpy as np

# Simple line plot
x = np.linspace(0, 10, 100)
y = np.sin(x)

plt.plot(x, y)
plt.xlabel('X-axis')
plt.ylabel('Y-axis')
plt.title('Sine Wave')
plt.show()
\`\`\`

### Multiple Lines

\`\`\`python
x = np.linspace(0, 10, 100)
y1 = np.sin(x)
y2 = np.cos(x)

plt.plot(x, y1, label='sin(x)')
plt.plot(x, y2, label='cos(x)')
plt.xlabel('X-axis')
plt.ylabel('Y-axis')
plt.title('Trigonometric Functions')
plt.legend()
plt.grid(True)
plt.show()
\`\`\`

---

## Plot Types

### Scatter Plot

\`\`\`python
x = np.random.rand(50)
y = np.random.rand(50)
colors = np.random.rand(50)
sizes = np.random.rand(50) * 1000

plt.scatter(x, y, c=colors, s=sizes, alpha=0.5, cmap='viridis')
plt.colorbar()
plt.xlabel('X-axis')
plt.ylabel('Y-axis')
plt.title('Scatter Plot')
plt.show()
\`\`\`

### Bar Chart

\`\`\`python
categories = ['A', 'B', 'C', 'D', 'E']
values = [23, 45, 56, 78, 32]

plt.bar(categories, values, color='steelblue')
plt.xlabel('Categories')
plt.ylabel('Values')
plt.title('Bar Chart')
plt.show()

# Horizontal bar chart
plt.barh(categories, values, color='coral')
plt.xlabel('Values')
plt.ylabel('Categories')
plt.title('Horizontal Bar Chart')
plt.show()
\`\`\`

### Histogram

\`\`\`python
data = np.random.randn(1000)

plt.hist(data, bins=30, edgecolor='black', alpha=0.7)
plt.xlabel('Value')
plt.ylabel('Frequency')
plt.title('Histogram')
plt.show()
\`\`\`

### Pie Chart

\`\`\`python
sizes = [30, 25, 20, 15, 10]
labels = ['A', 'B', 'C', 'D', 'E']
explode = (0.1, 0, 0, 0, 0)  # Explode first slice

plt.pie(sizes, labels=labels, explode=explode, autopct='%1.1f%%', startangle=90)
plt.axis('equal')  # Equal aspect ratio
plt.title('Pie Chart')
plt.show()
\`\`\`

---

## Customization

### Line Styles and Colors

\`\`\`python
x = np.linspace(0, 10, 100)

plt.plot(x, np.sin(x), 'r-', label='solid red')
plt.plot(x, np.sin(x) + 1, 'g--', label='dashed green')
plt.plot(x, np.sin(x) + 2, 'b:', label='dotted blue')
plt.plot(x, np.sin(x) + 3, 'm-.', label='dash-dot magenta')

plt.legend()
plt.show()
\`\`\`

### Markers

\`\`\`python
x = np.arange(0, 10)
y = x ** 2

plt.plot(x, y, marker='o', markersize=10, markerfacecolor='red', linestyle='-', linewidth=2)
plt.xlabel('X')
plt.ylabel('Y')
plt.title('Line with Markers')
plt.show()
\`\`\`

---

## Subplots

### Creating Subplots

\`\`\`python
fig, axes = plt.subplots(2, 2, figsize=(10, 8))

# Access each subplot
axes[0, 0].plot([1, 2, 3], [1, 4, 9])
axes[0, 0].set_title('Plot 1')

axes[0, 1].scatter([1, 2, 3], [1, 4, 9], color='red')
axes[0, 1].set_title('Plot 2')

axes[1, 0].bar([1, 2, 3], [1, 4, 9], color='green')
axes[1, 0].set_title('Plot 3')

axes[1, 1].hist(np.random.randn(100), bins=20)
axes[1, 1].set_title('Plot 4')

plt.tight_layout()
plt.show()
\`\`\`

### Subplot with Different Sizes

\`\`\`python
fig = plt.figure(figsize=(12, 8))

# Create grid
gs = fig.add_gridspec(3, 3)

# Large subplot
ax1 = fig.add_subplot(gs[0:2, :])
ax1.plot([1, 2, 3], [1, 4, 9])
ax1.set_title('Large Plot')

# Small subplots
ax2 = fig.add_subplot(gs[2, 0])
ax2.scatter([1, 2, 3], [1, 4, 9])
ax2.set_title('Small 1')

ax3 = fig.add_subplot(gs[2, 1])
ax3.bar([1, 2, 3], [1, 4, 9])
ax3.set_title('Small 2')

ax4 = fig.add_subplot(gs[2, 2])
ax4.hist(np.random.randn(100))
ax4.set_title('Small 3')

plt.tight_layout()
plt.show()
\`\`\`

---

## Figure and Axes

### Object-Oriented Interface

\`\`\`python
# Create figure and axes
fig, ax = plt.subplots(figsize=(10, 6))

# Plot on axes
x = np.linspace(0, 10, 100)
ax.plot(x, np.sin(x), label='sin(x)')
ax.plot(x, np.cos(x), label='cos(x)')

# Customize axes
ax.set_xlabel('X-axis', fontsize=14)
ax.set_ylabel('Y-axis', fontsize=14)
ax.set_title('Sine and Cosine', fontsize=16, fontweight='bold')
ax.legend(fontsize=12)
ax.grid(True, alpha=0.3)

# Set limits
ax.set_xlim(0, 10)
ax.set_ylim(-1.5, 1.5)

plt.show()
\`\`\`

---

## Advanced Styling

### Using Styles

\`\`\`python
# Available styles
print(plt.style.available)

# Use a style
plt.style.use('seaborn-v0_8-darkgrid')

x = np.linspace(0, 10, 100)
plt.plot(x, np.sin(x))
plt.title('Styled Plot')
plt.show()

# Reset to default
plt.style.use('default')
\`\`\`

### Custom Colors and Fonts

\`\`\`python
fig, ax = plt.subplots(figsize=(10, 6))

x = np.linspace(0, 10, 100)
ax.plot(x, np.sin(x), color='#FF6B6B', linewidth=3)

ax.set_facecolor('#F0F0F0')
fig.patch.set_facecolor('white')

ax.set_xlabel('X', fontsize=14, fontfamily='serif')
ax.set_ylabel('Y', fontsize=14, fontfamily='serif')
ax.set_title('Custom Styled Plot', fontsize=16, fontfamily='serif', pad=20)

plt.show()
\`\`\`

---

## Annotations and Text

### Adding Text

\`\`\`python
fig, ax = plt.subplots(figsize=(10, 6))

x = np.linspace(0, 10, 100)
y = np.sin(x)
ax.plot(x, y)

# Add text
ax.text(5, 0.5, 'Peak', fontsize=12, color='red')

# Annotate with arrow
ax.annotate('Maximum', xy=(np.pi/2, 1), xytext=(2, 0.7),
            arrowprops=dict(arrowstyle='->', color='red'),
            fontsize=12, color='red')

ax.set_title('Plot with Annotations')
plt.show()
\`\`\`

---

## Saving Figures

\`\`\`python
fig, ax = plt.subplots(figsize=(10, 6))

x = np.linspace(0, 10, 100)
ax.plot(x, np.sin(x))
ax.set_title('My Plot')

# Save as PNG
plt.savefig('plot.png', dpi=300, bbox_inches='tight')

# Save as PDF
plt.savefig('plot.pdf', bbox_inches='tight')

# Save as SVG
plt.savefig('plot.svg', bbox_inches='tight')

plt.show()
\`\`\`

---

## Real-World Example: Sales Dashboard

\`\`\`python
import matplotlib.pyplot as plt
import numpy as np

# Sample data
months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
sales = [23000, 25000, 27000, 26000, 30000, 32000]
expenses = [18000, 19000, 20000, 19500, 22000, 23000]

# Create dashboard
fig = plt.figure(figsize=(15, 10))
gs = fig.add_gridspec(2, 2, hspace=0.3, wspace=0.3)

# Sales trend
ax1 = fig.add_subplot(gs[0, :])
ax1.plot(months, sales, marker='o', linewidth=2, markersize=8, label='Sales')
ax1.plot(months, expenses, marker='s', linewidth=2, markersize=8, label='Expenses')
ax1.set_title('Sales vs Expenses Trend', fontsize=16, fontweight='bold')
ax1.set_ylabel('Amount ($)', fontsize=12)
ax1.legend(fontsize=12)
ax1.grid(True, alpha=0.3)
ax1.set_ylim(15000, 35000)

# Profit bar chart
profit = np.array(sales) - np.array(expenses)
ax2 = fig.add_subplot(gs[1, 0])
colors = ['green' if p > 0 else 'red' for p in profit]
ax2.bar(months, profit, color=colors, alpha=0.7)
ax2.set_title('Monthly Profit', fontsize=14, fontweight='bold')
ax2.set_ylabel('Profit ($)', fontsize=12)
ax2.axhline(y=0, color='black', linestyle='-', linewidth=0.5)
ax2.grid(True, alpha=0.3, axis='y')

# Expense breakdown pie chart
categories = ['Salaries', 'Marketing', 'Operations', 'Other']
expense_breakdown = [45, 25, 20, 10]
ax3 = fig.add_subplot(gs[1, 1])
ax3.pie(expense_breakdown, labels=categories, autopct='%1.1f%%', startangle=90)
ax3.set_title('Expense Breakdown', fontsize=14, fontweight='bold')

plt.suptitle('Sales Dashboard - Q1 & Q2 2024', fontsize=18, fontweight='bold', y=0.98)
plt.savefig('sales_dashboard.png', dpi=300, bbox_inches='tight')
plt.show()
\`\`\`

---

## Common Pitfalls

### Pitfall 1: Not Using tight_layout

\`\`\`python
# Bad: Overlapping labels
fig, axes = plt.subplots(2, 2)
for ax in axes.flat:
    ax.plot([1, 2, 3])
    ax.set_xlabel('X-axis')
    ax.set_ylabel('Y-axis')
plt.show()  # Labels overlap!

# Good: Use tight_layout
fig, axes = plt.subplots(2, 2)
for ax in axes.flat:
    ax.plot([1, 2, 3])
    ax.set_xlabel('X-axis')
    ax.set_ylabel('Y-axis')
plt.tight_layout()
plt.show()
\`\`\`

### Pitfall 2: Not Closing Figures

\`\`\`python
# Bad: Memory leak
for i in range(100):
    plt.figure()
    plt.plot([1, 2, 3])
    # Missing plt.close()

# Good: Close figures
for i in range(100):
    fig = plt.figure()
    plt.plot([1, 2, 3])
    plt.close(fig)
\`\`\`

---

## Quick Practice

1. Create a line plot with multiple lines
2. Create a subplot with different chart types
3. Customize colors and labels

**Solution:**
\`\`\`python
import matplotlib.pyplot as plt
import numpy as np

# Create figure with subplots
fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 5))

# Line plot
x = np.linspace(0, 10, 100)
ax1.plot(x, np.sin(x), 'b-', label='sin(x)', linewidth=2)
ax1.plot(x, np.cos(x), 'r--', label='cos(x)', linewidth=2)
ax1.set_xlabel('X', fontsize=12)
ax1.set_ylabel('Y', fontsize=12)
ax1.set_title('Trigonometric Functions', fontsize=14, fontweight='bold')
ax1.legend(fontsize=10)
ax1.grid(True, alpha=0.3)

# Bar chart
categories = ['A', 'B', 'C', 'D']
values = [23, 45, 56, 78]
ax2.bar(categories, values, color=['red', 'green', 'blue', 'orange'], alpha=0.7)
ax2.set_xlabel('Category', fontsize=12)
ax2.set_ylabel('Value', fontsize=12)
ax2.set_title('Bar Chart', fontsize=14, fontweight='bold')
ax2.grid(True, alpha=0.3, axis='y')

plt.tight_layout()
plt.savefig('practice_plot.png', dpi=150)
plt.show()
\`\`\`

---

## Key Takeaways

- Matplotlib is Python's foundational plotting library
- Use plt.plot() for line plots, plt.scatter() for scatter plots
- Subplots allow multiple charts in one figure
- Object-oriented interface (fig, ax) provides more control
- Always use tight_layout() to prevent overlapping
- Save figures with savefig() in various formats
- Customize with colors, markers, and styles
- Add annotations for important points
- Close figures to prevent memory leaks
- Essential foundation for data visualization

---

**Congratulations!** You've completed the Data Processing module!
`
  }
];
