

import Message_Class from '@/components/Message_Class';

const serverUrl = 'http://100.90.53.59:5121';
const defaultNodeName = 'chat-messages';


export function sendMessage(text:string) : Message_Class {
    console.log("Sending message:", text);
    var isodate = new Date(Date.now()).toISOString();
    var formattedMessage = {fromusername: 'current_user', tousername: 'recipient_user', timestamp: isodate, content: text};
    fetch(`${serverUrl}/${defaultNodeName}`, {
        method: 'POST',
        headers: {
            
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(formattedMessage),
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
    })
    .then(data => {
        console.log('Message sent successfully:', data);
    })
    .catch((error) => {
        console.error('Error sending message:', error);
    });
    return new Message_Class(formattedMessage.content, formattedMessage.fromusername, formattedMessage.tousername, formattedMessage.timestamp, formattedMessage.content);
    // Here you would typically send the message to your backend or update your state
}

export function fetchMessages() {fetch(`${serverUrl}/${defaultNodeName}`)
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        console.log('Fetched messages:', data);
        // Here you would typically update your state with the fetched messages
    })
    .catch((error) => {
        console.error('Error fetching messages:', error);
    });
}
