import * as _ from 'lodash';
import * as React from 'react';

import * as PropTypes from 'prop-types';
import State, {
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

interface ChatPaneProps {

}

interface ChatPaneState {
    sendText: string
}

export default class ChatPane extends React.Component<ChatPaneProps, ChatPaneState> {
    public static contextTypes = {
        state: PropTypes.any.isRequired
    };
    context: {
        state: State,
    };
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
        const { chatHistory } = this.context.state;
        const { sendText } = this.state;
        return (
            <Paper style={{ display: 'flex', flexDirection: 'column', minWidth: '300px', width: '20%', zIndex: 10 }}>
                <List style={{flex: 1}}>
                    {_.flatten(chatHistory.map((chat) => {
                        return [
                            <ListItem
                                primaryText={getPlayerByUUID(this.context.state, chat.user).username}
                                secondaryText={chat.text}
                            />,
                            <Divider inset />,
                        ]
                    }))}
                </List>
                <TextField
                    ref={(r) => this.textField = r}
                    style={{ marginBottom: '0px', flex: '1', marginRight: '2px' }}
                    value={sendText}
                    hintText='Chat'
                    onChange={this.inputChange}
                    onKeyPress={this.handleKeyPress}
                    onBlur={this.setGameFocus} />
            </Paper>);
    }

    private onFocusChange(e: GameFocusEvent) {
        if (e.prev === 'chat' && e.focus !== 'chat' && this.textField) {
            this.textField.blur();
        }
    }

    private setGameFocus() {
        GameFocusChange.post({ focus: 'game', prev: this.context.state.focused });
    }

    private setChatFocus(e: React.MouseEvent<HTMLDivElement>) {
        GameFocusChange.post({ focus: 'chat', prev: this.context.state.focused });
        e.stopPropagation();
    }

    private chatChangeHandler(e: ChatEvent) {
        this.forceUpdate();
    }

    private inputChange(event: React.FormEvent<{}>) {
        this.setState({ sendText: (event.target as any).value });
    }

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