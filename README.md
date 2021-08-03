from re import split
import psycopg2
from tkinter import *
from tkinter import simpledialog
import random
import time
import tkinter as tk
import numpy

mydb = psycopg2.connect(
    host="ec2-54-167-152-185.compute-1.amazonaws.com",
    database="d4cmkjovb160kc",
    user="xlwlxuhkkbziie",
    password="1bfa0836d3a74c78e697087970e1416ffebaff1f43a777d99745f904f5c7736b",
    port="5432"
)

mycursor = mydb.cursor()

mycursor.execute("SELECT id FROM vocabulary_days WHERE day = 1")

myresult = mycursor.fetchall()
myresults = []
for id in myresult:
    myresults.append(id[0])
ids = []
myresult = numpy.array(myresults)
length = len(myresult)
for i in range(0, (length // 5) - 1):
    ids.append(myresult[i*5:(i*5 + 5)])
    ids.append(myresult[i*5:(i*5 + 5)])
    ids.append(myresult[i*5:(i*5 + 5)])
    ids.append(myresult[i*5:(i*5 + 5)])
    ids.append(myresult[i*5:(i*5 + 5)])
ids.append(myresult[((length // 5) * 5):length])
ids.append(myresult[((length // 5) * 5):length])
ids.append(myresult[((length // 5) * 5):length])
ids.append(myresult[((length // 5) * 5):length])
ids.append(myresult[((length // 5) * 5):length])

myresults = myresult
while True:
    for myresults in ids:
        length = len(myresults)
        i = 0
        myresult = myresults
        for i in range(0, length):
            id = random.randrange(len(myresult))
            query = "SELECT english, spell, vietnamese FROM vocabulary_days WHERE id = " + \
                str(myresult[id]) + "and day = 1"

            mycursor.execute(query)

            vocabulary = mycursor.fetchall()
            vocabulary = {
                'english': vocabulary[0][0],
                'spell': vocabulary[0][1]['us'],
                'vietnamese': vocabulary[0][2]
            }

            ROOT = tk.Tk()

            ROOT.withdraw()

            USER_INP = simpledialog.askstring(
                title="Test", prompt=vocabulary['english'])
            Entry(ROOT).focus()
            vietnamese = vocabulary['vietnamese'].split(',')
            for index, vietnam in enumerate(vietnamese):
                vietnamese[index] = vietnam.strip()

            if USER_INP == None:
                myresult = numpy.delete(myresult, id)
                continue

            if USER_INP.strip() in vietnamese:
                tk.messagebox.showinfo(
                    'Đúng', vocabulary['english'] + '\n' + vocabulary['spell'] + '\n' + vocabulary['vietnamese'])
                time.sleep(30)
            else:
                tk.messagebox.showerror(
                    'Sai', vocabulary['english'] + '\n' + vocabulary['spell'] + '\n' + vocabulary['vietnamese'])
                time.sleep(30)
            myresult = numpy.delete(myresult, id)
