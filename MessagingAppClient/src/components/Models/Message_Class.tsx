
class Message_Class {
    id: string;
    fromusername: string;
    destination: string;
    timestamp: string           
    content: string;

    constructor(id: string, fromusername: string, destination: string, timestamp: string, content: string) {
        this.id = id;
        this.fromusername = fromusername;
        this.destination = destination;
        this.timestamp = timestamp;
        this.content = content;
    }   
}

export default Message_Class;  