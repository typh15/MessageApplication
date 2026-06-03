

import Message_Class from '@/components/Models/Message_Class';
import AsyncStorage from '@react-native-async-storage/async-storage';

const serverUrl = 'http://100.90.53.59:5121';
const defaultNodeName = 'chat-messages';


export async function sendMessage(text:string, from_user: string, destination: string) : Promise<Message_Class> {
    console.log("Sending message:", text);

    var existingUniqueId = await AsyncStorage.getItem('uniqueid');
    console.log("Using Unique ID:", existingUniqueId);
    var isodate = new Date(Date.now()).toISOString();
    var formattedMessage = {FromUserName: from_user, ToUserName: destination, LocalTimestamp: isodate, Content: text, UniqueId: existingUniqueId ?? ""};
    const response = await fetch(`${serverUrl}/${defaultNodeName}`, {
        method: 'POST',
        headers: {
            
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(formattedMessage),
    });
    if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response from server:', errorText);
        throw new Error('Network response was not ok');
    }

    const returnedText = await response.text();

    const uniqueIdToUse = returnedText || existingUniqueId || "";

    if (returnedText) {
        console.log('Unique ID from server:', returnedText);
        await AsyncStorage.setItem('uniqueid', returnedText);
    }

    return new Message_Class(uniqueIdToUse, from_user, destination, isodate, text);
    
}

export async function fetchMessages() {
    const response = await fetch(`${serverUrl}/${defaultNodeName}`);
    if (!response.ok) {
        throw new Error('Network response was not ok');
    }
    const data = await response.json();
    console.log('Fetched messages:', data);
    // Here you would typically update your state with the fetched messages
}