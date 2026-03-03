import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getDatabase, ref, push, onChildAdded } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyCaCtnz5ZJPJtq04Xm24dw5xc7QPZUHue",
  authDomain: "bittalk-e6df4.firebaseapp.com",
  databaseURL: "https://bittalk-e6df4-default-rtdb.firebaseio.com",
  projectId: "bittalk-e6df4",
  storageBucket: "bittalk-e6df4.firebasestorage.app",
  messagingSenderId: "1083926758846",
  appId: "1:1083926758846:web:51032b148e48556bca25ef"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const messagesRef = ref(db, 'messages');

const input = document.getElementById('messageInput');
const btn = document.getElementById('sendBtn');
const messagesDiv = document.getElementById('messages');

btn.onclick = () => {
    if (input.value.trim()) {
        push(messagesRef, { text: input.value });
        input.value = '';
    }
};

onChildAdded(messagesRef, (data) => {
    const msg = document.createElement('div');
    msg.className = "bg-gray-700 p-2 rounded-lg max-w-[80%] mb-2 self-start";
    msg.innerText = data.val().text;
    messagesDiv.appendChild(msg);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
});
