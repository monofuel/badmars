import { autobind } from 'core-decorators';
import * as _ from 'lodash';
import * as React from 'react';
import * as PropTypes from 'prop-types';
import GameState, {
    ChatEvent,
    ChatChange,
    getPlayerByUUID,
    GameFocusEvent,
    GameFocusChange
} from '../state';
import { List, ListItem } from 'material-ui/List';
import { Divider, Paper } from 'material-ui';
import { RequestChange } from '../net';
import TextField from 'material-ui/TextField';
import config from '../config';

interface ChatPaneProps {

}

interface ChatPaneState {
    sendText: string
}

export default class ChatPane extends React.Component<ChatPaneProps, ChatPaneState> {
    props: ChatPaneProps;
    state: ChatPaneState = {
        sendText: ''
    }
    textField: TextField | null;
    handler: (e: ChatEvent) => void

    componentDidMount() {
        this.handler = (e: ChatEvent) => this.chatChangeHandler(e)
        ChatChange.attach(this.handler)
    }

    componentWillUnmount() {
        ChatChange.detach(this.handler)
    }

    render() {
        const { chatHistory } = gameState;
        const { sendText } = this.state;
        return (
            <Paper
                style={{ display: 'flex', flexDirection: 'column', minWidth: '300px', width: '20%', zIndex: 10 }}
                onMouseDown={this.setChatFocus}>
                {/* TODO hide the scroll bar, but still let it be scrollable? */}
                <List style={{ flex: 1, display: 'flex', overflowY: 'scroll', flexDirection: 'column', justifyContent: 'flex-end' }}>
                    {_.flatten(chatHistory.map((chat) => {
                        return [
                            <p
                                style={{ margin: '10px' }}
                                key={chat.uuid + '|text'}
                            >{chat.text}</p>,
                            <p
                                style={{ margin: '5px', alignSelf: 'flex-end' }}
                                key={chat.uuid + '|name'}>
                                {'- ' + getPlayerByUUID(chat.user).username}
                            </p>,
                            <Divider key={chat.uuid + '|div'} inset style={{ margin: 0 }} />,
                        ]
                    }))}
                </List>
                <TextField
                    ref={(r) => this.textField = r}
                    style={{ marginBottom: '0px', width: '100%', marginRight: '2px' }}
                    value={sendText}
                    hintText='Chat'
                    hintStyle={{ color: config.palette.fontColor }}
                    onChange={this.inputChange}
                    onKeyPress={this.handleKeyPress}
                    onBlur={this.setGameFocus} />
            </Paper>);
    }
    @autobind
    private onFocusChange(e: GameFocusEvent) {
        if (e.prev === 'chat' && e.focus !== 'chat' && this.textField) {
            this.textField.blur();
        }
    }
    @autobind
    private setGameFocus() {
        GameFocusChange.post({ focus: 'game', prev: gameState.focused });
    }
    @autobind
    private setChatFocus(e: React.MouseEvent<HTMLDivElement>) {
        GameFocusChange.post({ focus: 'chat', prev: gameState.focused });
        e.stopPropagation();
    }
    @autobind
    private chatChangeHandler(e: ChatEvent) {
        console.log('got chat message')
        this.forceUpdate();
    }
    @autobind
    private inputChange(event: React.FormEvent<{}>) {
        this.setState({ sendText: (event.target as any).value });
    }
    @autobind
    private handleKeyPress(event: React.KeyboardEvent<{}>) {
        const { sendText } = this.state;
        if (event.charCode !== 13 || !sendText) {
            return;
        }

        RequestChange.post({ type: 'sendChat', text: sendText });

        this.setState({ sendText: '' });

        // for some reason this function gets called twice? questionmark?
        this.state.sendText = '';
    }
}