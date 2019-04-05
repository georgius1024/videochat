import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import 'webrtc-adapter'

import classNames from 'classnames'
import Modal from 'react-bootstrap/Modal'
import Button from 'react-bootstrap/Button'
import Form from 'react-bootstrap/Form'

import ObservableSocket from './observable-socket'
import { CameraSubscription, CameraControlSubscription } from './Subscription'
import Publication from './Publication'
import actions from './store/actions'
import styles from './App.module.scss'

import './assets/bootstrap.css'
import './patch_sdp'

const ROOM_ID = 'chatroom'

class App extends Component {
  constructor(props) {
    super(props)
    this.state = {
      userName: window.localStorage.getItem('user-name') || '',
      socketConected: false,
      modalActive: false,
      errorMessage: '',
      genericMessage: ''
    }
    const BACKEND_URL = process.env.NODE_ENV === 'production' ? window.location.host : '192.168.1.40:5781'
    this.socket = new ObservableSocket(`wss://${BACKEND_URL}/${ROOM_ID}`, false)

    this.socket.reconnect = true
    this.socket.reconnectInterval = 1000 * 60

    this.socket.open$.subscribe(() => {
      this.setState({ modalActive: true, socketConected: true })
    })

    this.socket.error$.subscribe(() => {
      this.error('Socket error')
      this.disconnectAll()
    })

    this.socket.close$.subscribe(() => {
      this.error('Socket disconnected')
      this.setState({ socketConected: false })
      this.disconnectAll()
    })

    this.socket.message$.subscribe(message => {
      switch (message.id) {
      case 'welcome':
        this.props.publicationAdd(message.participantId + '-camera')
        break
      case 'publications':
        {
          const subscriptions = []
          message.data.forEach(publisher =>
            publisher.channels.forEach(channel => {
              subscriptions.push({ channel, name: publisher.name })
            })
          )
          this.props.subscriptionUpdateAll(subscriptions)
        }
        break
      default:
      }
    })
    this.props.userNameUpdate(window.localStorage.getItem('user-name') || '')
    this.logging = process.env.NODE_ENV !== 'production'
    this.login = this.login.bind(this)
    this.logout = this.logout.bind(this)
    this.updateUserName = this.updateUserName.bind(this)
  }

  componentDidMount() {
    this.socket.connect()
  }

  componentWillUnmount() {
    this.disconnectAll()
    this.socket.disconnect()
  }

  disconnectAll() {
    this.props.publicationRemove()
    this.props.subscriptionRemoveAll()
  }

  send(id, channel, data) {
    this.socket.sendMessageInChannel(id, channel, data)
  }

  log(message, data) {
    if (this.logging) {
      if (arguments.length === 2) {
        console.log('App:', message, data)
      } else {
        console.log('App:', message)
      }
    }
  }

  error(error) {
    console.error(error)
    if (typeof error !== 'string') {
      if (typeof error.message === 'string') {
        error = error.message
      } else {
        error = JSON.stringify(error)
      }
    }
    this.setState({ errorMessage: error })
    setTimeout(() => {
      this.setState({ errorMessage: '' })
    }, 3000)
  }

  message(message) {
    if (typeof message !== 'string') {
      message = JSON.stringify(message)
    }
    this.log('got message', message)
    this.setState({ genericMessage: message })
    setTimeout(() => {
      this.setState({ genericMessage: '' })
    }, 3000)
  }

  updateUserName(event) {
    this.props.userNameUpdate(event.target.value)
  }

  login() {
    this.setState({ modalActive: false }, () => {
      window.localStorage.setItem('user-name', this.props.userName)
      this.send('join', undefined, { name: this.props.userName })
    })
  }

  logout() {
    this.disconnectAll()
    this.setState({ modalActive: true })
  }

  myPublication() {
    if (this.props.publication) {
      return (
        <Publication
          key={this.props.publication + 'pub'}
          channel={this.props.publication}
          socket={this.socket}
          logging={this.logging}
          audio={this.props.audio}
          video={this.props.video}
        />
      )
    }
  }

  myCamera() {
    return this.props.subscriptions
      .filter(subscription => subscription.channel === this.props.publication)
      .map(myCamera => {
        const toggleAudio = () => {
          return this.props.audio ? this.props.audioDisable() : this.props.audioEnable()
        }
        const toggleVideo = () => {
          return this.props.video ? this.props.videoDisable() : this.props.videoEnable()
        }
        return (
          <CameraControlSubscription
            key={myCamera.channel}
            channel={myCamera.channel}
            socket={this.socket}
            logging={this.logging}
            audio={this.props.audio}
            video={this.props.video}
            toggleAudio={toggleAudio}
            toggleVideo={toggleVideo}
          />
        )
      })
  }

  roomParticipantrs() {
    return this.props.subscriptions
      .filter(subscription => subscription.channel !== this.props.publication)
      .map(subscription => {
        return (
          <CameraSubscription
            key={subscription.channel}
            channel={subscription.channel}
            displayName={subscription.name}
            socket={this.socket}
            logging={this.logging}
          />
        )
      })
  }

  render() {
    return (
      <div className="container">
        <nav className="navbar navbar-light bg-light">
          <span className="navbar-brand mb-0 h1">
            <span className="ml-2">Видеочат</span>
          </span>
          <button className="btn btn-link" onClick={this.logout}>
            Выйти
          </button>
        </nav>
        <div
          className={classNames({
            jumbotron: true,
            'jumbotron-fluid': true,
            'd-none': this.state.socketConected
          })}
        >
          <div className="container">
            <h1 className="display-4">Подключение</h1>
            <p className="lead">Установка соединения с сервером</p>
          </div>
        </div>
        <div
          className={classNames({
            alert: true,
            'alert-primary': true,
            'd-none': !this.state.genericMessage
          })}
          role="alert"
        >
          {String(this.state.genericMessage)}
        </div>
        <div
          className={classNames({
            alert: true,
            'alert-danger': true,
            'd-none': !this.state.errorMessage
          })}
          role="alert"
        >
          {String(this.state.errorMessage)}
        </div>

        <div className={styles.participants}>
          {this.myCamera()}
          {this.roomParticipantrs()}
        </div>
        {this.myPublication()}

        <Modal show={this.state.modalActive && this.state.socketConected} backdrop="static" centered keyboard={false}>
          <Modal.Header>
            <Modal.Title>Вход в видеочат</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form>
              <Form.Group controlId="userName">
                <Form.Label>Представьтесь:</Form.Label>
                <Form.Control
                  type="text"
                  value={this.props.userName}
                  onChange={this.updateUserName}
                  required
                  maxLength="40"
                  placeholder="Ваше имя"
                  autoFocus
                />
              </Form.Group>
            </Form>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="primary" disabled={this.props.userName.length < 3} onClick={this.login}>
              Продолжить
            </Button>
          </Modal.Footer>
        </Modal>
      </div>
    )
  }
}

App.propTypes = {
  publication: PropTypes.string,
  subscriptions: PropTypes.array,
  audio: PropTypes.bool,
  video: PropTypes.bool,
  userName: PropTypes.string,
  publicationAdd: PropTypes.func,
  publicationRemove: PropTypes.func,
  subscriptionRemoveAll: PropTypes.func,
  subscriptionUpdateAll: PropTypes.func,
  audioEnable: PropTypes.func,
  audioDisable: PropTypes.func,
  videoEnable: PropTypes.func,
  videoDisable: PropTypes.func,
  userNameUpdate: PropTypes.func
}

const mapStateToProps = state => {
  return {
    publication: state.publication,
    subscriptions: state.subscriptions,
    audio: state.audio,
    video: state.video,
    userName: state.userName
  }
}

const mapDispatchToProps = dispatch => {
  return {
    publicationAdd: payload => dispatch(actions.publicationAdd(payload)),
    publicationRemove: payload => dispatch(actions.publicationRemove(payload)),
    subscriptionRemoveAll: payload => dispatch(actions.subscriptionRemoveAll(payload)),
    subscriptionUpdateAll: payload => dispatch(actions.subscriptionUpdateAll(payload)),
    audioEnable: payload => dispatch(actions.audioEnable(payload)),
    audioDisable: payload => dispatch(actions.audioDisable(payload)),
    videoEnable: payload => dispatch(actions.videoEnable(payload)),
    videoDisable: payload => dispatch(actions.videoDisable(payload)),
    userNameUpdate: payload => dispatch(actions.userNameUpdate(payload))
  }
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(App)
