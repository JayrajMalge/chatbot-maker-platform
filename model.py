import random


class ModeltoPkl:
    def __init__(self,Model,couter,data):
        self.model = Model
        self.counter = couter
        self.data = data
    
    def predict(self,text : str):
        testing=self.counter.transform(text.lower().split()).toarray()
        output=self.model.predict(testing)
        random_number = random.randint(0, len(self.data[self.data['intent']==output[0]]))
        predicted_records = self.data[self.data['intent']==output[0]]
        return predicted_records.iloc[random_number]
        