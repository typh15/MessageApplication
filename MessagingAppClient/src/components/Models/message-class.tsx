
class Message_Class {
    id: string;
    fromusername: string;
    destination: string;
    timestamp: string           
    content: string;
    messageType: 'text' | 'image';
    imageId?: string;
    displayName?: string;

    constructor(
        id: string,
        fromusername: string,
        destination: string,
        timestamp: string,
        content: string,
        messageType: 'text' | 'image' = 'text',
        imageId?: string,
        displayName?: string
    ) {
        this.id = id;
        this.fromusername = fromusername;
        this.destination = destination;
        this.timestamp = timestamp;
        this.content = content;
        this.messageType = messageType;
        this.imageId = imageId;
        this.displayName = displayName;
    }   
}

export default Message_Class;  
