"""Vercel API endpoint for money muling detection."""
import json
from urllib.parse import parse_qs

# Try to import the backend modules
try:
    import sys
    import os
    
    # Add the parent directory to the path
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    
    from backend.utils.csv_parser import parse_csv
    from backend.services.detection_engine import run_detection
    
    BACKEND_AVAILABLE = True
except ImportError:
    BACKEND_AVAILABLE = False


def parse_multipart_body(body, boundary):
    """Parse multipart form data."""
    import re
    
    # Simple multipart parser
    parts = body.split(b'--' + boundary.encode())
    file_content = None
    
    for part in parts:
        if b'Content-Type: text/csv' in part or b'filename=' in part:
            # Extract file content
            match = re.search(b'\r\n\r\n(.+?)(?=\r\n--|$)', part, re.DOTALL)
            if match:
                file_content = match.group(1).decode('utf-8')
                break
    
    return file_content


def handler(request):
    """Vercel Python handler function."""
    
    if not BACKEND_AVAILABLE:
        return {
            'statusCode': 500,
            'body': json.dumps({'detail': 'Backend modules not available. Please deploy backend separately.'})
        }
    
    if request.method == 'POST':
        try:
            # Get the request body
            body = request.body
            
            # Parse content type
            content_type = request.headers.get('content-type', '')
            
            if 'multipart/form-data' in content_type:
                # Extract boundary
                boundary = content_type.split('boundary=')[-1]
                file_content = parse_multipart_body(body, boundary)
                
                if not file_content:
                    return {
                        'statusCode': 400,
                        'body': json.dumps({'detail': 'No file found in request'})
                    }
                
                # Parse CSV
                try:
                    transactions = parse_csv(file_content)
                except ValueError as e:
                    return {
                        'statusCode': 400,
                        'body': json.dumps({'detail': f'CSV parsing error: {str(e)}'})
                    }
                
                if not transactions:
                    return {
                        'statusCode': 400,
                        'body': json.dumps({'detail': 'No transactions found in CSV'})
                    }
                
                # Run detection
                try:
                    result = run_detection(transactions)
                    return {
                        'statusCode': 200,
                        'headers': {'Content-Type': 'application/json'},
                        'body': json.dumps(result.model_dump())
                    }
                except Exception as e:
                    return {
                        'statusCode': 500,
                        'body': json.dumps({'detail': f'Detection error: {str(e)}'})
                    }
            else:
                return {
                    'statusCode': 400,
                    'body': json.dumps({'detail': 'Content-Type must be multipart/form-data'})
                }
                
        except Exception as e:
            return {
                'statusCode': 500,
                'body': json.dumps({'detail': f'Unexpected error: {str(e)}'})
            }
    
    elif request.method == 'GET':
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'status': 'ok', 'message': 'Money Muling Detection Engine API'})
        }
    
    else:
        return {
            'statusCode': 405,
            'body': json.dumps({'detail': 'Method not allowed'})
        }
