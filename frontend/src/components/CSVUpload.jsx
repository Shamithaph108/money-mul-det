import React, { useState } from 'react'
import axios from 'axios'
import './CSVUpload.css'

const CSVUpload = ({ onDetectionComplete, onError, onLoading, onTransactionsLoaded }) => {
  const [file, setFile] = useState(null)
  const [dragActive, setDragActive] = useState(false)

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }

  const validateCSV = (file) => {
    if (!file.name.endsWith('.csv')) {
      throw new Error('File must be a CSV file')
    }
    return true
  }

  // Parse CSV file to extract transaction data
  const parseCSV = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = (e) => {
        try {
          const text = e.target.result
          const lines = text.split('\n').filter(line => line.trim())
          
          if (lines.length < 2) {
            reject(new Error('CSV file is empty or has no data rows'))
            return
          }
          
          // Parse header
          const header = lines[0].split(',').map(h => h.trim().toLowerCase())
          const requiredColumns = ['transaction_id', 'sender_id', 'receiver_id', 'amount', 'timestamp']
          
          // Validate header
          const missingColumns = requiredColumns.filter(col => !header.includes(col))
          if (missingColumns.length > 0) {
            reject(new Error(`Missing required columns: ${missingColumns.join(', ')}`))
            return
          }
          
          // Get column indices
          const txnIdx = header.indexOf('transaction_id')
          const senderIdx = header.indexOf('sender_id')
          const receiverIdx = header.indexOf('receiver_id')
          const amountIdx = header.indexOf('amount')
          const timestampIdx = header.indexOf('timestamp')
          
          // Parse data rows
          const transactions = []
          for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim())
            
            if (values.length >= 5) {
              transactions.push({
                transaction_id: values[txnIdx],
                sender_id: values[senderIdx],
                receiver_id: values[receiverIdx],
                amount: parseFloat(values[amountIdx]),
                timestamp: values[timestampIdx]
              })
            }
          }
          
          resolve(transactions)
        } catch (err) {
          reject(err)
        }
      }
      
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsText(file)
    })
  }

  const handleFile = async (selectedFile) => {
    try {
      validateCSV(selectedFile)
      setFile(selectedFile)
      
      // Parse CSV to get transactions for graph visualization
      const transactions = await parseCSV(selectedFile)
      
      // Pass transactions to parent if callback provided
      if (onTransactionsLoaded) {
        onTransactionsLoaded(transactions)
      }
      
      await uploadAndDetect(selectedFile)
    } catch (err) {
      onError(err.message || 'File validation failed')
    }
  }

  const uploadAndDetect = async (fileToUpload) => {
    const formData = new FormData()
    formData.append('file', fileToUpload)

    onLoading(true)
    onError(null)

    try {
      // Use `VITE_API_URL` when provided (set in Render or other host),
      // fall back to relative `/api/detect` so same-origin hosting still works.
      const baseUrl = import.meta.env.VITE_API_URL || (import.meta.env.MODE === 'development' ? 'http://localhost:8000' : '')
      const apiEndpoint = `${baseUrl}/api/detect`.replace('//api', '/api')

      const response = await axios.post(apiEndpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      onDetectionComplete(response.data)
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.message || 'Detection failed'
      onError(errorMessage)
    } finally {
      onLoading(false)
    }
  }

  return (
    <div className="csv-upload">
      <h2>Upload Transaction CSV</h2>
      <p className="upload-description">
        Upload a CSV file with the following columns:
        <br />
        <code>transaction_id, sender_id, receiver_id, amount, timestamp</code>
      </p>

      <div
        className={`upload-area ${dragActive ? 'drag-active' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          id="file-upload"
          accept=".csv"
          onChange={handleFileInput}
          style={{ display: 'none' }}
        />
        <label htmlFor="file-upload" className="upload-label">
          <div className="upload-icon">📁</div>
          <p>
            {file ? file.name : 'Click to upload or drag and drop'}
          </p>
          <span className="upload-hint">CSV files only</span>
        </label>
      </div>

      {file && (
        <div className="file-info">
          <p>Selected: <strong>{file.name}</strong></p>
          <p>Size: {(file.size / 1024).toFixed(2)} KB</p>
        </div>
      )}
    </div>
  )
}

export default CSVUpload
