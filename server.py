from flask import Flask, render_template, request, jsonify, session,send_file
import io
import os
from datetime import datetime
import uuid
import pandas as pd
from sklearn.preprocessing import LabelEncoder

from sklearn.naive_bayes import MultinomialNB
from sklearn.linear_model import LogisticRegression
from nltk.stem import PorterStemmer
from model import ModeltoPkl
import dill;

from gensim.utils import simple_preprocess
from sklearn.feature_extraction.text import CountVectorizer
from nltk.tokenize import word_tokenize
from nltk.corpus import stopwords
import nltk
from gensim.models import Word2Vec
import re
import numpy as np

app = Flask(__name__)

chatbots_storage = {}

@app.route('/')
def home():
    return render_template('index.html')

import pandas as pd

@app.route('/api/create-chatbot', methods=['POST'])
def create_chatbot():
    try:
        data = request.get_json()
        if not data or 'chatbotName' not in data:
            return jsonify({
                'status': 'error',
                'message': 'Chatbot name is required'
            }), 400
        
        chatbot_name = data.get('chatbotName', '').strip()
        if not chatbot_name:
            return jsonify({
                'status': 'error',
                'message': 'Chatbot name cannot be empty'
            }), 400
        
        intents = data.get('intents', [])
        for intent in intents:
            intent_name = intent.get('name', '').strip()
            if not intent_name:
                return jsonify({
                    'status': 'error',
                    'message': 'All intents must have a name'
                }), 400
            
            questions = intent.get('questions', [])
            answers = intent.get('answers', [])
            
            if not questions:
                return jsonify({
                    'status': 'error', 
                    'message': f'Intent "{intent_name}" must have at least one question'
                }), 400
            
            if not answers:
                return jsonify({
                    'status': 'error',
                    'message': f'Intent "{intent_name}" must have at least one answer'
                }), 400
        dataframe_rows = []
        
        for intent in intents:
            intent_name = intent.get('name', '').strip()
            questions = intent.get('questions', [])
            answers = intent.get('answers', [])            
            for question in questions:
                for answer in answers:
                    dataframe_rows.append({
                    'question': question.lower().strip(),
                    'answer': answer.lower() if answer.lower() else "",
                    'intent': intent_name.lower()
                   })
        
        df = pd.DataFrame(dataframe_rows)
        encoder=LabelEncoder()
        df['intent']=encoder.fit_transform(df['intent'])
        bow_x,counter = create_courpus(df)
        bow_x['output']=df['intent']    
        bow_trainer=MultinomialNB()
        bow_trainer.fit(bow_x.drop(columns=['output']),bow_x['output'])
        savetopkl=ModeltoPkl(bow_trainer,counter,df)
        pickle_buffer = io.BytesIO()
        dill.dump(savetopkl, pickle_buffer)
        pickle_buffer.seek(0) 
        chatbot_id = str(uuid.uuid4())
        chatbot_data = {
            'id': chatbot_id,
            'name': chatbot_name,
            'intents': intents,
            'dataframe': df.to_dict('records'),  # Store dataframe as serializable dict
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat()
        }
        
        chatbots_storage[chatbot_id] = chatbot_data        
        return send_file(
            pickle_buffer,
            as_attachment=True,
            download_name=f"{chatbot_name.replace(' ', '_')}_model.pkl",
            mimetype='application/octet-stream'
        ) 
    
    except Exception as e:
        print(f"Error creating chatbot: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': f'Internal server error: {str(e)}'
        }), 500

@app.route('/api/chatbots', methods=['GET'])
def get_chatbots():
    try:
        chatbots_list = []
        for chatbot_id, chatbot_data in chatbots_storage.items():
            chatbots_list.append({
                'id': chatbot_id,
                'name': chatbot_data['name'],
                'intent_count': len(chatbot_data['intents']),
                'created_at': chatbot_data['created_at']
            })
        
        return jsonify({
            'status': 'success',
            'chatbots': chatbots_list
        })
    
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'Error fetching chatbots: {str(e)}'
        }), 500

@app.route('/api/chatbot/<chatbot_id>', methods=['GET'])
def get_chatbot(chatbot_id):
    try:
        if chatbot_id not in chatbots_storage:
            return jsonify({
                'status': 'error',
                'message': 'Chatbot not found'
            }), 404
        
        return jsonify({
            'status': 'success',
            'chatbot': chatbots_storage[chatbot_id]
        })
    
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'Error fetching chatbot: {str(e)}'
        }), 500

@app.route('/api/chatbot/<chatbot_id>', methods=['DELETE'])
def delete_chatbot(chatbot_id):
    try:
        if chatbot_id not in chatbots_storage:
            return jsonify({
                'status': 'error',
                'message': 'Chatbot not found'
            }), 404
        
        deleted_chatbot = chatbots_storage.pop(chatbot_id)
        
        return jsonify({
            'status': 'success',
            'message': f'Chatbot "{deleted_chatbot["name"]}" deleted successfully'
        })
    
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'Error deleting chatbot: {str(e)}'
        }), 500

@app.route('/api/export-chatbot/<chatbot_id>', methods=['GET'])
def export_chatbot(chatbot_id):
    try:
        if chatbot_id not in chatbots_storage:
            return jsonify({
                'status': 'error',
                'message': 'Chatbot not found'
            }), 404
        
        chatbot_data = chatbots_storage[chatbot_id]
        
        return jsonify({
            'status': 'success',
            'chatbot': chatbot_data,
            'export_format': 'json'
        })
    
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'Error exporting chatbot: {str(e)}'
        }), 500

@app.errorhandler(404)
def not_found(error):
    return jsonify({
        'status': 'error',
        'message': 'Endpoint not found'
    }), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({
        'status': 'error',
        'message': 'Internal server error'
    }), 500

def create_courpus(data):
    nltk.download('stopwords')
    stops=stopwords.words("english")
    stemmer=PorterStemmer()
    corpus=[]
    for index in range(len((data))):
        question=data['question'][index]
        question=re.sub('[^a-z A-Z 0-9]',' ',question)
        question=question.lower()
        question=question.split()
        question=[stemmer.stem(word) for word in question if word not in stops]
        question=" ".join(question)
        corpus.append(question)
    couter=CountVectorizer(max_features=150,binary=False)
    bow_x=couter.fit_transform(corpus).toarray()
    bow_x=pd.DataFrame(bow_x)
    return bow_x,couter

def avgerage_vector(doc,processor):
    return np.mean([processor.wv[word] for word in doc if word in processor.wv.index_to_key],axis=0)

def findall_avg(words):
    processor=Word2Vec(words,vector_size=100)
    x=[]
    for word in words:
        x.append(avgerage_vector(word,processor=processor))
    return x



@app.route('/api/upload-json-chatbot', methods=['POST'])
def upload_json_chatbot():
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'status': 'error',
                'message': 'No JSON data received'
            }), 400
        
        # Validate required fields
        required_fields = ['chatbotName', 'intents']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'status': 'error',
                    'message': f'Missing required field: {field}'
                }), 400
        
        chatbot_name = data['chatbotName'].strip()
        if not chatbot_name:
            return jsonify({
                'status': 'error',
                'message': 'Chatbot name cannot be empty'
            }), 400
        
        intents = data['intents']
        if not isinstance(intents, list):
            return jsonify({
                'status': 'error',
                'message': 'Intents must be an array'
            }), 400
        
        for i, intent in enumerate(intents):
            if not intent.get('name') or not intent.get('name').strip():
                return jsonify({
                    'status': 'error',
                    'message': f'Intent at index {i} must have a name'
                }), 400
            
            questions = intent.get('questions', [])
            answers = intent.get('answers', [])
            
            if not questions:
                return jsonify({
                    'status': 'error',
                    'message': f'Intent "{intent["name"]}" must have at least one question'
                }), 400
            
            if not answers:
                return jsonify({
                    'status': 'error',
                    'message': f'Intent "{intent["name"]}" must have at least one answer'
                }), 400
        
        chatbot_id = str(uuid.uuid4())
        dataframe_rows = []
        for intent in intents:
            intent_name = intent.get('name', '').strip()
            questions = intent.get('questions', [])
            answers = intent.get('answers', [])            
            for question in questions:
                for answer in answers:
                    dataframe_rows.append({
                    'question': question.lower().strip(),
                    'answer': answer.lower() if answer.lower() else "",
                    'intent': intent_name.lower()
                   })
        
        df = pd.DataFrame(dataframe_rows)
        encoder=LabelEncoder()
        df['intent']=encoder.fit_transform(df['intent'])
        bow_x,counter = create_courpus(df)
        bow_x['output']=df['intent']   
        bow_trainer=MultinomialNB()
        bow_trainer.fit(bow_x.drop(columns=['output']),bow_x['output'])
        savetopkl=ModeltoPkl(bow_trainer,counter,df)
        pickle_buffer = io.BytesIO()
        dill.dump(savetopkl, pickle_buffer)
        pickle_buffer.seek(0)  
        chatbot_data = {
            'id': chatbot_id,
            'name': chatbot_name,
            'intents': intents,
            'dataframe': df.to_dict('records'),
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat()
        }
        chatbots_storage[chatbot_id] = chatbot_data
        return send_file(
            pickle_buffer,
            as_attachment=True,
            download_name=f"{chatbot_name.replace(' ', '_')}_model.pkl",
            mimetype='application/octet-stream'
        ) 
        
    except Exception as e:
        print(f"Error creating chatbot from JSON: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': f'Internal server error: {str(e)}'
        }), 500

if __name__ == '__main__':
    os.makedirs('templates', exist_ok=True)
    os.makedirs('static/css', exist_ok=True)
    os.makedirs('static/js', exist_ok=True)
    
    print("Starting Flask server...")
    print("Access the application at: http://localhost:5000")
    app.run(debug=True, host='0.0.0.0', port=5000)