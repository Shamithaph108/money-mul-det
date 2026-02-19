# Money Muling Detection Engine

A production-ready web application for detecting money muling rings using graph-based algorithms. The system analyzes transaction data to identify suspicious patterns and fraud rings.

## 🎯 Project Overview

This system accepts CSV transaction uploads and detects money muling patterns using three core detection algorithms:
- **Cycle Detection**: Identifies circular transaction flows (rings)
- **Smurfing Detection**: Detects fan-in/fan-out patterns (structuring)
- **Layered Shell Detection**: Finds chains with low-degree intermediate nodes

## 🏗️ Architecture Overview

### Backend (Python/FastAPI)
```
backend/
├── api/              # FastAPI endpoints
├── models/           # Pydantic data models
├── services/         # Core detection algorithms
│   ├── graph_builder.py
│   ├── cycle_detection.py
│   ├── smurfing_detection.py
│   ├── shell_detection.py
│   ├── scoring.py
│   ├── json_formatter.py
│   └── detection_engine.py
└── utils/            # CSV parsing utilities
```

### Frontend (React/Vite)
```
frontend/
├── src/
│   ├── components/   # React components
│   │   ├── CSVUpload.jsx
│   │   ├── GraphVisualization.jsx
│   │   ├── FraudRingTable.jsx
│   │   ├── DetectionSummary.jsx
│   │   └── DownloadButton.jsx
│   └── App.jsx       # Main application
└── public/
```

## 📋 Input Specification

CSV files must contain **exactly** these columns:
- `transaction_id` (String)
- `sender_id` (String)
- `receiver_id` (String)
- `amount` (Float)
- `timestamp` (YYYY-MM-DD HH:MM:SS)

**Example:**
```csv
transaction_id,sender_id,receiver_id,amount,timestamp
TXN_001,ACC_001,ACC_002,1000.50,2024-01-15 10:30:00
TXN_002,ACC_002,ACC_003,2000.75,2024-01-15 11:45:00
```

## 🔍 Detection Algorithms

### 1. Cycle Detection

**Algorithm**: NetworkX `simple_cycles` with bounded length filtering

**Pattern**: Simple cycles of length 3-5 nodes

**Complexity**: O((n+m) * c) where:
- n = nodes, m = edges
- c = number of cycles (bounded by max_length=5)

**Pattern Label**: `cycle_length_3`, `cycle_length_4`, `cycle_length_5`

**Scoring**: +40 points per cycle participation

### 2. Smurfing Detection

**Algorithm**: Sliding window with timestamp filtering

**Patterns**:
- **Fan-in**: ≥10 unique senders → 1 receiver within 72 hours
- **Fan-out**: 1 sender → ≥10 receivers within 72 hours

**Complexity**: O(n) where n = number of transactions

**Pattern Labels**: `fan_in_10_72h`, `fan_out_10_72h`

**Scoring**: +30 points per smurfing pattern

### 3. Layered Shell Detection

**Algorithm**: DFS-based chain detection with degree filtering

**Pattern**: Chains of length ≥3 where intermediate nodes have total degree ≤3

**Complexity**: O(n * d^l) where:
- n = nodes
- d = average degree
- l = chain length (bounded)

**Pattern Label**: `layered_shell_3hop`, `layered_shell_4hop`, etc.

**Scoring**: +25 points per shell participation

## 📊 Suspicion Score Methodology

### Scoring Model (0-100 cap)

| Pattern | Base Score |
|---------|-----------|
| Cycle Detection | +40 |
| Smurfing Detection | +30 |
| Shell Detection | +25 |
| High Velocity | +15 |

### Additional Factors

- **High Velocity**: Accounts with ≥50 transactions/day
- **Payroll Pattern Filter**: Accounts with regular monthly patterns (CV < 0.3) are excluded from high velocity scoring
- **Score Aggregation**: Multiple patterns accumulate (capped at 100)

### Avoided False Positives

- High-volume merchant accounts (filtered by payroll pattern detection)
- Regular monthly transaction patterns
- Low-degree intermediate nodes in legitimate chains

## 📤 Output Schema

The system generates JSON output matching this exact schema:

```json
{
  "suspicious_accounts": [
    {
      "account_id": "ACC_00123",
      "suspicion_score": 87.5,
      "detected_patterns": ["cycle_length_3"],
      "ring_id": "RING_001"
    }
  ],
  "fraud_rings": [
    {
      "ring_id": "RING_001",
      "member_accounts": ["ACC_00123", "ACC_00456"],
      "pattern_type": "cycle",
      "risk_score": 95.3
    }
  ],
  "summary": {
    "total_accounts_analyzed": 500,
    "suspicious_accounts_flagged": 15,
    "fraud_rings_detected": 4,
    "processing_time_seconds": 2.3
  }
}
```

**Key Rules**:
- `suspicious_accounts` sorted descending by `suspicion_score`
- All scores capped at 100.0
- Exact field names and data types as specified

## 🚀 Getting Started

### Prerequisites

- Python 3.9+
- Node.js 18+
- npm or yarn

### Backend Setup

```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run backend server (from project root)
# Windows:
python backend/main.py
# Or use the batch script:
run_backend.bat

# Linux/Mac:
python backend/main.py
# Or use the shell script:
chmod +x run_backend.sh
./run_backend.sh
```

**Note**: Make sure to run from the project root directory so Python can resolve the `backend` module imports.

Backend runs on `http://localhost:8000`

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev
```

Frontend runs on `http://localhost:5173`

### Production Build

```bash
# Frontend
cd frontend
npm run build

# Backend (use production WSGI server)
uvicorn backend.api.main:app --host 0.0.0.0 --port 8000
```

## 🧪 Testing

### Sample CSV Generation

Create a test CSV file with the required columns:

```csv
transaction_id,sender_id,receiver_id,amount,timestamp
TXN_001,ACC_001,ACC_002,1000.00,2024-01-15 10:00:00
TXN_002,ACC_002,ACC_003,2000.00,2024-01-15 11:00:00
TXN_003,ACC_003,ACC_001,1500.00,2024-01-15 12:00:00
```

### API Testing

```bash
# Health check
curl http://localhost:8000/api/health

# Upload CSV
curl -X POST -F "file=@transactions.csv" http://localhost:8000/api/detect
```

## ⚡ Performance

- **Target**: Handle up to 10,000 transactions
- **Processing Time**: <30 seconds for 10k transactions
- **Optimizations**:
  - Adjacency list representation (NetworkX)
  - Bounded cycle detection (max length 5)
  - Efficient timestamp filtering
  - O(n) smurfing detection

## 🔧 Configuration

### Detection Parameters

Edit `backend/services/` files to adjust:
- Cycle length bounds (default: 3-5)
- Smurfing threshold (default: 10 connections)
- Time window (default: 72 hours)
- Shell chain length (default: ≥3)
- Intermediate node degree limit (default: ≤3)

### Scoring Weights

Edit `backend/services/scoring.py`:
```python
SCORE_CYCLE = 40
SCORE_SMURFING = 30
SCORE_SHELL = 25
SCORE_HIGH_VELOCITY = 15
```

## 📝 Known Limitations

1. **Cycle Detection**: Exponential worst-case complexity for dense graphs (mitigated by max_length=5)
2. **Graph Visualization**: Simplified edge representation (shows ring connections, not full transaction graph)
3. **Large Datasets**: For >10k transactions, consider:
   - Batch processing
   - Graph sampling
   - Distributed processing
4. **Real-time Processing**: Current implementation is batch-oriented
5. **Pattern Overlap**: Accounts may belong to multiple rings (handled by ring_id assignment)

## 🛠️ Development

### Project Structure

```
money-mulling-det/
├── backend/
│   ├── api/          # FastAPI routes
│   ├── models/       # Data models
│   ├── services/     # Business logic
│   └── utils/        # Utilities
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   └── App.jsx
│   └── public/
├── requirements.txt
├── package.json
└── README.md
```

### Code Style

- Python: PEP 8
- JavaScript: ESLint (recommended)
- Type hints used in Python
- JSDoc comments in JavaScript

## 📄 License

This project is built for hackathon demonstration purposes.

## 👥 Contributing

This is a hackathon project. For production use, consider:
- Adding comprehensive test coverage
- Implementing authentication/authorization
- Adding database persistence
- Implementing real-time monitoring
- Adding more sophisticated pattern detection algorithms

---

**Built with**: FastAPI, NetworkX, React, Cytoscape.js, Vite
# money-mulling-det
