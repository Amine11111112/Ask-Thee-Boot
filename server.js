const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public'));

const users = {};  // لتخزين المستخدمين المتصلين ومعرفاتهم
const messages = {};  // لتخزين الرسائل لكل مستخدم

io.on('connection', (socket) => {
    console.log('User connected');

    // تسجيل المستخدم وتخزين بياناته
    socket.on('register', (username) => {
        users[socket.id] = { username }; // تخزين اسم المستخدم ومعرفه
        messages[socket.id] = messages[socket.id] || [];  // إنشاء قائمة الرسائل إذا لم تكن موجودة
        console.log(`New user registered: ${username}`);
        
        // تحديث قائمة المستخدمين للمدير
        io.emit('userListUpdate', Object.keys(users).map(id => ({ id, username: users[id].username })));

        // إرسال الرسائل السابقة للمستخدم عند الاتصال
        socket.emit('previousMessages', messages[socket.id]);
    });

    // استقبال الرسالة من المستخدمين وتخزينها وإرسالها إلى المدير
    socket.on('message', (msg) => {
        const username = users[socket.id].username;
        const userMessage = { username, msg, timestamp: new Date().toLocaleString() };
        
        // تخزين الرسالة للمستخدم
        messages[socket.id].push(userMessage);
        
        // إرسال الرسالة إلى المدير
        io.emit('adminMessage', { id: socket.id, ...userMessage });
    });

    // استقبال الرسالة من المدير وإرسالها إلى مستخدم معين
    socket.on('adminToUser', ({ userId, message }) => {
        if (users[userId]) {
            io.to(userId).emit('message', { from: 'Ask The Boot', message });
        }
    });

    socket.on('disconnect', () => {
        console.log(`User ${users[socket.id].username} disconnected`);
        delete users[socket.id];
        // تحديث قائمة المستخدمين للمدير
        io.emit('userListUpdate', Object.keys(users).map(id => ({ id, username: users[id].username })));
    });
});

// تعديل المسار هنا
app.get('/admin', (req, res) => {
    res.sendFile(__dirname + '/public/admin.html'); // تأكد من أن المسار صحيح
});

server.listen(3000, '192.168.0.111', () => {
    console.log('Server running on http://192.168.0.111:3000');
});
