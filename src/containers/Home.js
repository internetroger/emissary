import React, { Component, Fragment } from 'react';
import MessageContainer from './messageContainer';
import NavBar from './navBar'
import Greeting from '../components/Greeting'


const actioncable = require("actioncable")

class Home extends Component {

    constructor(props) {
        super(props)
        this.state = {
            cable: null,
            conversations: [],
            activeConversation: null,
            error: false
        }
      }
      
    
      componentDidMount = () => {
        fetch(`http://localhost:3000/conversations`, {
          headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`
          }
         })
        .then(res => res.json())
        .then(json => {
        if (json.error) {
          this.setState({error: true})
        } else {
            this.setState({conversations: json,
            })
            // ASYNC FUCKUP, I THINK. DOESN'T GET UPDATED BEFORE RENDER
            const ac = actioncable.createConsumer('ws://localhost:3000/cable')
            // this.state.cable = ac 
            this.setState({cable: ac})
            console.log("componentDidMount", this.state.cable)
            this.state.cable.subscriptions.create({channel: "ConversationsChannel"}, {
                connected: () => {console.log("connected ConversationsChannel")},
                disconnected: () => {console.log("disconnected ConversationsChannel")},
                received: data => {this.handleReceivedConversation(data)}
            })
            this.conversationChannels = []
            json.forEach(conversation => {
            this.conversationChannels[`${conversation.id}`] = this.state.cable.subscriptions.create({
                channel: "MessagesChannel",
                id: conversation.id
            },{
                connected: () => {console.log("connected", conversation.id)},
                disconnected: () => {console.log("disconnected", conversation.id)},
                received: data => {this.handleReceivedMessage(data)}
            })
            } 
            )
        }})
        }

      handleActiveConversation = activeConversation => {
        this.setState({activeConversation: activeConversation})
      }

      handleDelete = conversation => {
        console.log("HANDLEDELETE CALLED")
        this.setState({activeConversation: null})
        this.conversationChannels[conversation.id].unsubscribe()
        const c = {conversation: {id: conversation.id, title: conversation.title, topic: conversation.topic}}
        this.setState({conversations: this.state.conversations.filter(function(convo){return convo !== conversation})})
        fetch('http://localhost:3000/conversations', {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-type": "application/json"
        },
          body: JSON.stringify(c)
        }).then(res => res.json())
        .then(json => console.log(json))
      }

    
      handleReceivedMessage = message => {
        const {conversation_id} = message
        console.log("HANDLERECEIVEDMESSAGE CALLED")
        this.setState(prevState => {
          const conversations = [...prevState.conversations]
          const convo = conversations.find(convo => convo.id === conversation_id)
            if(!!convo.messages) {
                if (convo.messages.includes(message)){
                    return conversations
                } else {
                    convo.messages = [...convo.messages, message]
                    return conversations
                }
        } else {
            convo.messages = [message]
            return conversations
        }
        })
      }
      handleReceivedConversation = conversation => {
        console.log(conversation)
        this.setState(prevState => ({
            conversations: [...prevState.conversation], conversation
        }))
      }
    
      onAddMessage = (message) => {
        this.conversationChannels[this.state.activeConversation.id].send({
          text: message,
          conversation_id: this.state.activeConversation.id,
          user_id: localStorage.getItem("token")
        })
      }

      render() {
          const {conversations, activeConversation, error, cable} = this.state
          console.log("HOME CABLE", this.state)
        return(
            <Fragment>
                <NavBar 
                  conversations={conversations} 
                  handleActiveConversation={this.handleActiveConversation}
                  handleDelete={this.handleDelete}
                  onLogout={this.logout}
                  cable={cable}
                  history={this.props.history}
                />
              {error ? this.props.history.push('/login') : null}
                    {activeConversation ?
                    <MessageContainer activeConversation={activeConversation} onAddMessage={this.onAddMessage}  />
                : <Greeting />}
                
            </Fragment>
        )
      }
    
}

export default Home;