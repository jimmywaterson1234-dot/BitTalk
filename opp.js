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

// Инициализация
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// Глобальные переменные
let currentUser = null;
let currentChat = 'global'; // 'global' или UID другого пользователя
let userData = {}; // Данные профиля текущего пользователя

// --- ЭЛЕМЕНТЫ DOM ---
const authScreen = document.getElementById('auth-screen');
const appScreen = document.getElementById('app-screen');
const errorText = document.getElementById('auth-error');
const messagesContainer = document.getElementById('messages-container');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const settingsModal = document.getElementById('settings-modal');

// --- АВТОРИЗАЦИЯ И РЕГИСТРАЦИЯ ---
// Хак: так как юзер хочет только "юзернейм", превращаем его в фиктивный email для Firebase
const getFakeEmail = (username) => `${username.toLowerCase()}@bittalk.app`;

document.getElementById('register-btn').addEventListener('click', async () => {
    const user = document.getElementById('username-input').value.trim();
    const pass = document.getElementById('password-input').value.trim();
    if(user.length < 3) return errorText.innerText = "Юзернейм слишком короткий";
    
    try {
        // 1. Проверяем, свободен ли юзернейм
        const snapshot = await get(ref(db, `usernames/${user.toLowerCase()}`));
        if (snapshot.exists()) {
            return errorText.innerText = "Юзернейм занят, выберите другой";
        }
        
        // 2. Создаем аккаунт
        const userCredential = await createUserWithEmailAndPassword(auth, getFakeEmail(user), pass);
        const uid = userCredential.user.uid;
        
        // 3. Сохраняем профиль в БД
        await set(ref(db, `users/${uid}`), {
            username: user,
            nickname: user,
            bio: "",
            avatar: user.charAt(0).toUpperCase() // Заглушка
        });
        await set(ref(db, `usernames/${user.toLowerCase()}`), uid);
        
    } catch (error) {
        errorText.innerText = "Ошибка: " + error.message;
    }
});

document.getElementById('login-btn').addEventListener('click', async () => {
    const user = document.getElementById('username-input').value.trim();
    const pass = document.getElementById('password-input').value.trim();
    try {
        await signInWithEmailAndPassword(auth, getFakeEmail(user), pass);
    } catch (error) {
        errorText.innerText = "Неверный юзернейм или пароль";
    }
});

// Слушатель состояния пользователя (Вход/Выход)
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        authScreen.classList.remove('active');
        appScreen.classList.add('active');
        
        // Получаем данные юзера из БД
        onValue(ref(db, `users/${user.uid}`), (snapshot) => {
            userData = snapshot.val() || {};
        });

        loadGlobalChat();
    } else {
        currentUser = null;
        authScreen.classList.add('active');
        appScreen.classList.remove('active');
    }
});

// --- ЧАТ (ЛОГИКА) ---
function loadGlobalChat() {
    currentChat = 'global';
    document.getElementById('current-chat-title').innerText = "Общий чат";
    
    const chatRef = ref(db, 'global_chat');
    onValue(chatRef, async (snapshot) => {
        messagesContainer.innerHTML = '';
        const messages = snapshot.val();
        if(!messages) return;

        // Для оптимизации получаем всех юзеров (в реальном проекте кэшируется)
        const usersSnap = await get(ref(db, 'users'));
        const allUsers = usersSnap.val() || {};

        for (let key in messages) {
            const msg = messages[key];
            const sender = allUsers[msg.senderId];
            const isMe = msg.senderId === currentUser.uid;
            
            const msgDiv = document.createElement('div');
            msgDiv.className = `msg ${isMe ? 'me' : 'other'}`;
            msgDiv.innerHTML = `
                ${!isMe ? `<div class="msg-author">${sender?.nickname || 'Unknown'}</div>` : ''}
                <div class="msg-text">${msg.text}</div>
            `;
            messagesContainer.appendChild(msgDiv);
        }
        // Прокрутка вниз
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    });
}

// Отправка сообщения
sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

function sendMessage() {
    const text = messageInput.value.trim();
    if (!text) return;

    if (currentChat === 'global') {
        const chatRef = ref(db, 'global_chat');
        push(chatRef, {
            senderId: currentUser.uid,
            text: text,
            timestamp: serverTimestamp()
        });
    } else {
        // Здесь будет логика для приватных чатов (push в private_chats/chatId)
        alert('Личные сообщения находятся в разработке!');
    }
    
    messageInput.value = '';
}

// --- НАСТРОЙКИ И ПРОФИЛЬ ---
document.getElementById('settings-btn').addEventListener('click', () => {
    document.getElementById('profile-nickname').value = userData.nickname || '';
    document.getElementById('profile-bio').value = userData.bio || '';
    settingsModal.classList.remove('hidden');
});

document.getElementById('close-settings').addEventListener('click', () => {
    settingsModal.classList.add('hidden');
});

document.getElementById('save-profile-btn').addEventListener('click', async () => {
    const newNick = document.getElementById('profile-nickname').value;
    const newBio = document.getElementById('profile-bio').value;
    
    await set(ref(db, `users/${currentUser.uid}/nickname`), newNick);
    await set(ref(db, `users/${currentUser.uid}/bio`), newBio);
    
    alert('Профиль сохранен!');
    settingsModal.classList.add('hidden');
});

document.getElementById('logout-btn').addEventListener('click', () => {
    signOut(auth);
    settingsModal.classList.add('hidden');
});

// --- ПОИСК ---
document.getElementById('search-btn').addEventListener('click', async () => {
    const query = document.getElementById('search-input').value.trim().toLowerCase();
    if(!query) return;
    
    const snapshot = await get(ref(db, `usernames/${query}`));
    if (snapshot.exists()) {
        const targetUid = snapshot.val();
        if(targetUid === currentUser.uid) return alert('Это вы!');
        
        // Переключение на личный чат (базовая заготовка)
        alert(`Пользователь ${query} найден! Здесь должен открыться личный чат.`);
        // currentChat = generateChatId(currentUser.uid, targetUid);
    } else {
        alert('Пользователь не найден');
    }
});
                                
