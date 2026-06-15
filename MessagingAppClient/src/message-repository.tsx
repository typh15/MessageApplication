import Message_Class from "./components/Models/message-class";

class Message_Repo {
  private messages: Message_Class[] = [];

    constructor() {
        this.messages = [];
    }

    getMessages(): Message_Class[] {
        return this.messages;
    }

    addMessage(message: Message_Class): void {
        this.messages = [
        ...this.messages,
        message,
        ];
    }
}

export default Message_Repo;    
