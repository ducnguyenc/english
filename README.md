import psycopg2
from tkinter import *
from tkinter import simpledialog
import random
import time
import tkinter as tk
import numpy
from playsound import playsound
import os

conn = psycopg2.connect(
    database = "d4cmkjovb160kc", 
    user = "xlwlxuhkkbziie", 
    password = "1bfa0836d3a74c78e697087970e1416ffebaff1f43a777d99745f904f5c7736b", 
    host = "ec2-54-167-152-185.compute-1.amazonaws.com", 
    port = "5432"
)

day = '5'
mycursor = conn.cursor()
mycursor.execute("SELECT id FROM vocabulary_days WHERE day = " + day + " LIMIT 100 OFFSET 0")

myresult = mycursor.fetchall()
myresults = []
for id in myresult:
    myresults.append(id[0])
idSplits = []
myresult = numpy.array(myresults)
length = len(myresult)

for i in range(0, length, 5):
    idSplits.append(myresult[i:(i + 5)])
    idSplits.append(myresult[i:(i + 5)])
    idSplits.append(myresult[i:(i + 5)])

# while True:
for ids in idSplits:
    length = len(ids)
    i = 0
    myresult = ids
    for i in range(0, length):
        id = random.randrange(len(myresult))
        query = "SELECT english, spell, vietnamese, example FROM vocabulary_days WHERE id = " + \
            str(myresult[id]) + "and day = " + day

        mycursor.execute(query)

        vocabulary = mycursor.fetchall()
        vocabulary = {
            'english': vocabulary[0][0],
            'spell': vocabulary[0][1]['us'],
            'vietnamese': vocabulary[0][2],
            'example': vocabulary[0][3] if bool(vocabulary[0][3]) else ''
        }

        ROOT = tk.Tk()

        ROOT.withdraw()
        
        USER_INP = simpledialog.askstring(
            title="Test", prompt=vocabulary['english'])
        path = vocabulary['english'] + '.mp3'
        if os.path.isfile(path):
            playsound(path)
        Entry(ROOT).focus()
        vietnamese = vocabulary['vietnamese'].split(',')
        for index, vietnam in enumerate(vietnamese):
            vietnamese[index] = vietnam.strip()

        # USER_INP = simpledialog.askstring(
        #     title="Test", prompt=vocabulary['vietnamese'])
        # path = 'https://drive.google.com/file/d/1ArE9DMJo1YY35VdP4MWsKDa-l3OZZZCx/view'
        # if os.path.isfile(path):
        #     playsound(path)
        # Entry(ROOT).focus()
        # vietnamese = vocabulary['english'].split(',')
        # for index, vietnam in enumerate(vietnamese):
        #     vietnamese[index] = vietnam.strip()

        if USER_INP == None:
            myresult = numpy.delete(myresult, id)
            continue

        if USER_INP.strip() in vietnamese:
            tk.messagebox.showinfo(
                'Đúng', vocabulary['english'] + '\n' + vocabulary['spell'] + '\n' + vocabulary['vietnamese'] + '\n' + vocabulary['example'])
            time.sleep(30)
        else:
            tk.messagebox.showerror(
                'Sai', vocabulary['english'] + '\n' + vocabulary['spell'] + '\n' + vocabulary['vietnamese'] + '\n' + vocabulary['example'])
            time.sleep(30)
        myresult = numpy.delete(myresult, id)
