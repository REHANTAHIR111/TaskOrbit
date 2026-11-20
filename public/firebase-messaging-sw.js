importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js");

const firebaseConfig = {
    apiKey: "AIzaSyAt-mp7V1RktlTBaduAzqYCyIjgmXYFIoE",
    authDomain: "techenix-60f2a.firebaseapp.com",
    projectId: "techenix-60f2a",
    storageBucket: "techenix-60f2a.firebasestorage.app",
    messagingSenderId: "874615804987",
    appId: "1:874615804987:web:f00da1a86b8e2a0f79f81e",
    measurementId: "G-12E6Y2PVY1"
  };

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
    // console.log("Received background message2: ", payload);
    const { title, body } = payload.data;
    self.registration.showNotification(title, {
        body: body,
        icon: (payload?.data?.image) ? payload?.data?.image : "/logo192.png"  // Make sure you have this icon in the public folder
    });
});
