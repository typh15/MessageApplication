
class Message_Class {
    id: string;
    fromusername: string;
    destination: string;
    timestamp: string           
    content: string;
    messageType: 'text' | 'image';
    imageId?: string;

    constructor(
        id: string,
        fromusername: string,
        destination: string,
        timestamp: string,
        content: string,
        messageType: 'text' | 'image' = 'text',
        imageId?: string
    ) {
        this.id = id;
        this.fromusername = fromusername;
        this.destination = destination;
        this.timestamp = timestamp;
        this.content = content;
        this.messageType = messageType;
        this.imageId = imageId;
    }   
}

export default Message_Class;  
