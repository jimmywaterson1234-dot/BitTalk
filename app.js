import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getDatabase, ref, set, push, onValue, get, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

// ВСТАВЬ СЮДА СВОИ ДАННЫЕ ИЗ FIREBASE КОНСОЛИ!
const firebaseConfig = {
  apiKey: "ТВОЙ_API_KEY",
  authDomain: "bittalk-e6df4.firebaseapp.com",
  databaseURL: "https://bittalk-e6df4-default-rtdb.firebaseio.com",
  projectId: "bittalk-e6df4",
  storageBucket: "bittalk-e6df4.appspot.com",
  messagingSenderId: "ТВОЙ_SENDER_ID",
  appId: "ТВОЙ_APP_ID"
};

// Ждем, пока вся страница загрузится, чтобы избежать ошибок
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM загружен. Запускаем BitTalk...");

    // Инициализация
    try {
        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        const db = getDatabase(app);
        console.log("Firebase успешно инициализирован!");

        // --- Все остальные функции и слушатели событий переносим сюда ---
        
        // Глобальные переменные, элементы DOM и т.д.
        let currentUser = null;
        let currentChat = 'global';
        let userData = {};

        const authScreen = document.getElementById('auth-screen');
        const appScreen = document.getElementById('app-screen');
        const errorText = document.getElementById('auth-error');
        // ... (остальные элементы)

        const getFakeEmail = (username) => `${username.toLowerCase()}@bittalk.app`;

        document.getElementById('register-btn').addEventListener('click', async () => {
            console.log("Нажата кнопка 'Регистрация'");
            errorText.innerText = "";
            const user = document.getElementById('username-input').value.trim();
            const pass = document.getElementById('password-input').value.trim();
            if(user.length < 3) return errorText.innerText = "Юзернейм слишком короткий";
            
            try {
                const snapshot = await get(ref(db, `usernames/${user.toLowerCase()}`));
                if (snapshot.exists()) {
                    return errorText.innerText = "Юзернейм занят, выберите другой";
                }
                
                const userCredential = await createUserWithEmailAndPassword(auth, getFakeEmail(user), pass);
                const uid = userCredential.user.uid;
                
                await set(ref(db, `users/${uid}`), {
                    username: user,
                    nickname: user,
                    bio: "",
                    avatar: user.charAt(0).toUpperCase()
                });
                await set(ref(db, `usernames/${user.toLowerCase()}`), uid);
                
            } catch (error) {
                console.error("Ошибка регистрации:", error);
                errorText.innerText = "Ошибка: " + error.code;
            }
        });

        document.getElementById('login-btn').addEventListener('click', async () => {
            console.log("Нажата кнопка 'Войти'");
            errorText.innerText = "";
            const user = document.getElementById('username-input').value.trim();
            const pass = document.getElementById('password-input').value.trim();
            try {
                await signInWithEmailAndPassword(auth, getFakeEmail(user), pass);
            } catch (error) {
                console.error("Ошибка входа:", error);
                errorText.innerText = "Неверный юзернейм или пароль";
            }
        });

        onAuthStateChanged(auth, async (user) => {
            if (user) {
                console.log("Пользователь вошел:", user.uid);
                // ... (остальной код, который был в onAuthStateChanged)
                currentUser = user;
                authScreen.classList.remove('active');
                appScreen.classList.add('active');
                
                onValue(ref(db, `users/${user.uid}`), (snapshot) => {
                    userData = snapshot.val() || {};
                });

                loadGlobalChat(db, user); // Передаем db и user
            } else {
                console.log("Пользователь вышел.");
                currentUser = null;
                authScreen.classList.add('active');
                appScreen.classList.remove('active');
            }
        });
        
        // ... (остальные функции sendMessage, loadGlobalChat и т.д. должны быть здесь)
        // Важно: нужно передавать db и currentUser в функции, если они нужны
        function loadGlobalChat(db, user) {
            currentChat = 'global';
            document.getElementById('current-chat-title').innerText = "Общий чат";
            
            const messagesContainer = document.getElementById('messages-container');
            const chatRef = ref(db, 'global_chat');
            onValue(chatRef, async (snapshot) => {
                messagesContainer.innerHTML = '';
                const messages = snapshot.val();
                if(!messages) return;

                const usersSnap = await get(ref(db, 'users'));
                const allUsers = usersSnap.val() || {};

                for (let key in messages) {
                    const msg = messages[key];
                    const sender = allUsers[msg.senderId];
                    const isMe = msg.senderId === user.uid;
                    
                    const msgDiv = document.createElement('div');
                    msgDiv.className = `msg ${isMe ? 'me' : 'other'}`;
                    msgDiv.innerHTML = `${!isMe ? `<div class="msg-author">${sender?.nickname || 'Unknown'}</div>` : ''}<div class="msg-text">${msg.text}</div>`;
                    messagesContainer.appendChild(msgDiv);
                }
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            });
        }
        
        // ... (и остальная часть кода для настроек, выхода, поиска)
        // ... (я для краткости их убрал, но они должны быть внутри DOMContentLoaded)


    } catch (e) {
        console.error("Критическая ошибка при инициализации Firebase:", e);
        alert("Не удалось загрузить приложение. Проверьте firebaseConfig в app.js и откройте консоль (F12) для просмотра ошибок.");
    }
});
