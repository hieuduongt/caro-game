import './App.css';
import React, { useEffect, useState } from 'react';
import * as signalR from '@microsoft/signalr';
import { Button, Form, Input, Spin, message, Alert, Statistic, Modal, List, Affix } from 'antd';
import { PlaySquareOutlined, SendOutlined, CaretDownOutlined, CaretUpOutlined, ExclamationCircleOutlined, SmileOutlined } from '@ant-design/icons';
import { PATH } from './Common/path';
const { Countdown } = Statistic;

const XIcon = () => {
  return (<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" fill="currentColor" className="bi bi-x-lg text-dark" viewBox="0 0 16 16"><path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854Z" /></svg>)
};

const OIcon = () => {
  return (<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" fill="currentColor" className="bi bi-circle text-danger" viewBox="0 0 16 16"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z" /></svg>)
};

const xIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" fill="currentColor" class="bi bi-x-lg text-dark" viewBox="0 0 16 16"><path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854Z"/></svg>`;
const oIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" fill="currentColor" class="bi bi-circle text-danger" viewBox="0 0 16 16"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/></svg>`

const Row = (props) => {
  return (<tr>{props.children}</tr>)
}

const Cell = (props) => {
  return (<td className='cell' coordinates={`${props.x},${props.y}`} onClick={props.onClick}></td>)
}

function App() {
  const [isPageReady, setIsPageReady] = useState(false);
  const [yourName, setYourName] = useState("");
  const [requestingOpen, setRequestingOpen] = useState(false);
  const [myConnectionId, setMyConnectionId] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(true);
  const [connection, setConnection] = useState(null);
  const [competitor, setCompetitor] = useState();
  const [resultMessage, setResultMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [chatToggles, setChatToggles] = useState([true, true]);
  const [xGridSize, setXGridSize] = useState([]);
  const [yGridSize, setYGridSize] = useState([]);
  const [gameboard, setGameBoard] = useState([]);
  const [listPlayers, setListPlayers] = useState([]);
  const [currentPlayer, setCurrentPlayer] = useState(1);
  const [turn, setTurn] = useState(0);
  const [deadline, setDeadLine] = useState(Date.now() + 60 * 1000);
  const [nameForm] = Form.useForm();
  const [modal, contextHolder] = Modal.useModal();

  const prepairGrid = (x, y) => {
    resetGrid();
    let gridX = [];
    let gridY = [];
    let board = [];
    for (let i = 0; i < x; i++) {
      gridX.push(i);
    }
    for (let i = 0; i < y; i++) {
      gridY.push(i);
    }
    for (let xIndex = 0; xIndex < x; xIndex++) {
      board[xIndex] = [];
      for (let yIndex = 0; yIndex < y; yIndex++) {
        board[xIndex][yIndex] = "";
      }
    }
    setXGridSize(gridX);
    setYGridSize(gridY);
    setGameBoard(board);
  }

  const resetGrid = () => {
    const filledCells = document.querySelectorAll("td.cell[selected]");
    filledCells.forEach(cell => {
      cell.innerHTML = "";
      cell.removeAttribute("selected");
    });
  }

  const confirm = (
    content = "",
    timeOut = 0,
    onOk = () => Modal.destroyAll(),
    onCancel = () => Modal.destroyAll(),
    onOkText = "Ok",
    onCancelText = "Cancel") => {
    modal.confirm({
      title: timeOut ? <Countdown title="Auto reset after" value={Date.now() + timeOut * 1000} format="ss" onFinish={() => onCancel()} /> : "Confirm",
      icon: <ExclamationCircleOutlined />,
      content: content,
      okText: onOkText,
      cancelText: onCancelText,
      onOk: () => onOk(),
      onCancel: () => onCancel(),
      centered: true,
    });
  }

  const startPlay = async (user) => {
    if (user) {
      setCompetitor(user);
    } else {
      Modal.destroyAll();
      setRequestingOpen(false);
      message.error("Could not find your competitor. Your competitor left!");
    }
  }

  useEffect(() => {
    setIsPageReady(false);
    prepairGrid(150, 150);
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${PATH.prod}/api/game`)
      .withAutomaticReconnect()
      .build();

    setConnection(connection);
  }, []);

  useEffect(() => {
    if (connection) {
      connection.start()
        .then(() => {
          setMyConnectionId(connection.connectionId);
          connection.on("AcceptedPlay", async (user) => {
            connection.send("UpdateStatus", false);
            setRequestingOpen(false);
            setCurrentPlayer(1);
            setTurn(1);
            startPlay(user);
            setDeadLine(Date.now() + 60 * 1000);
            Modal.destroyAll();
          });

          connection.on("RequestedPlay", (user, mess) => {
            confirm(mess, 30, () => {
              setCurrentPlayer(0);
              connection.send('AcceptPlay', user.connectionId);
              startPlay(user);
              connection.send("UpdateStatus", false);
              setDeadLine(Date.now() + 60 * 1000);
            },
              () => {
                connection.send('RejectPlay', user.connectionId);
                Modal.destroyAll();
              },
              "Play",
              "Cancel",
            )
          });

          connection.on("RejectedPlayAgain", (connId) => {
            prepairGrid(150, 150);
            setCompetitor(undefined);
            Modal.destroyAll();
            message.info("Your competitor leaved this game!!!");
            connection.send("UpdateStatus", true);
            setRequestingOpen(false);
          });

          connection.on("RejectedPlay", (connId, mess) => {
            setRequestingOpen(false);
            confirm(mess);
          });

          connection.on("YouLose", (connId) => {
            confirm(
              "You lose!!!",
              30,
              () => {
                prepairGrid(150, 150);
                setRequestingOpen(false);
                confirm("Waiting for your competitor...", 30);
              },
              () => {
                connection.send('RejectPlayAgain', connId);
                prepairGrid(150, 150);
                setCompetitor(undefined);
                connection.send("UpdateStatus", true);
              },
              "Replay",
              "Exit")
          });

          connection.on("NameExisted", (result) => {
            modal.confirm({
              title: `Error: ${result}`,
              icon: <ExclamationCircleOutlined />,
              content: "This name already existed!",
              okText: 'Ok',
              cancelText: '',
              onOk: () => { },
              centered: true,
            });
          });

          connection.on("SetNameDone", (result) => {
            setYourName(result);
            setIsModalOpen(false);
          });

          connection.on("YouWin", (connId) => {
            confirm(
              "You Win! Your competitor is out of time!",
              30,
              () => {
                prepairGrid(150, 150);
                setRequestingOpen(false);
              },
              () => {
                connection.send('RejectPlayAgain', connId);
                prepairGrid(150, 150);
                setCompetitor(undefined);
                connection.send("UpdateStatus", true);
              },
              "Replay",
              "Exit")
          });

          connection.on("IncomingMessage", async (connId, userName, mess) => {
            addMessages(connId, userName, mess, false);
          });

          connection.on("SwicthTurn", (connId, data) => {
            swicthTurn(data);
          });

          connection.on("UserChange", data => {
            setListPlayers(data);
          });

          setIsPageReady(true);
        })
        .catch((error) => {
          console.error(error);
          message.error("Cannot connect to server! Refreshing page...");
          window.location.reload();
        });
    }
  }, [connection]);

  const swicthTurn = (data) => {
    setTurn(1);
    setDeadLine(Date.now() + 60 * 1000);
    const cell = document.querySelector(`td[coordinates='${data.x},${data.y}']`);
    cell.innerHTML = data.competitor === 0 ? oIcon : xIcon;
    cell.setAttribute("selected", "true");
    cell.classList.add("choose");
    cell.scrollIntoView({
      behavior: 'auto',
      block: 'center',
      inline: 'center'
    });
    gameboard[data.x][data.y] = data.competitor;
  }

  const checkWinner = (x, y, checkingPlayer) => {
    let count = 0;
    for (let index = x - 4; index <= x + 4; index++) {
      const currentPlayer = getPointValue(index, y);
      if (currentPlayer === checkingPlayer) {
        count++;
        if (count === 5) {
          return checkingPlayer;
        }
      } else {
        count = 0;
      }
    }

    count = 0;
    for (let index = y - 4; index <= y + 4; index++) {
      const currentPlayer = getPointValue(x, index);
      if (currentPlayer === checkingPlayer) {
        count++;
        if (count === 5) {
          return checkingPlayer;
        }
      } else {
        count = 0;
      }
    }

    let checkPointXBL = x + 4;
    let checkPointYBL = y - 4;
    const stopPointXTR = x - 4;
    const stopPointYTR = y + 4;

    let checkPointXTL = x - 4;
    let checkPointYTL = y - 4;
    const stopPointXBR = x + 4;
    const stopPointYBR = y + 4;

    count = 0;
    while (checkPointYBL <= stopPointYTR && checkPointXBL >= stopPointXTR) {
      const currentPlayer = getPointValue(checkPointXBL, checkPointYBL);
      if (currentPlayer === checkingPlayer) {
        count++;
        if (count === 5) {
          return checkingPlayer;
        }
      } else {
        count = 0;
      }
      checkPointYBL++;
      checkPointXBL--;
    }
    count = 0;
    while (checkPointYTL <= stopPointYBR && checkPointXTL <= stopPointXBR) {
      const currentPlayer = getPointValue(checkPointXTL, checkPointYTL);
      if (currentPlayer === checkingPlayer) {
        count++;
        if (count === 5) {
          return checkingPlayer;
        }
      } else {
        count = 0;
      }
      checkPointXTL++;
      checkPointYTL++;
    }
  }

  const getPointValue = (x, y) => {
    try {
      return gameboard[x][y];
    } catch (error) {
      return "";
    }
  }

  const cellClick = (e, x, y) => {
    if (turn !== 1) {
      message.warning("Not your turn!");
      return;
    }
    if (!e || !e.target || e.target.nodeName.toLowerCase() !== "td") return;
    if (e.target.getAttribute("selected")) return;
    e.target.innerHTML = currentPlayer === 1 ? xIcon : oIcon;
    e.target.setAttribute("selected", "true");
    const activeCell = document.querySelector(".cell.choose");
    if (activeCell) activeCell.classList.remove("choose");
    gameboard[x][y] = currentPlayer;
    const winner = checkWinner(x, y, currentPlayer);
    if (winner !== undefined) {
      confirm(
        "You Win!",
        30,
        () => {
          prepairGrid(150, 150);
          setRequestingOpen(false);
        },
        () => {
          connection.send('RejectPlayAgain', competitor.connectionId);
          prepairGrid(150, 150);
          setCompetitor(undefined);
          connection.send("UpdateStatus", true);
        },
        "Replay",
        "Exit");
      connection.send("FoundWinner", competitor.connectionId);
    } else {
      setTurn(0);
      connection.send('Transfer', competitor.connectionId, { x: x, y: y, competitor: currentPlayer });
      setDeadLine(Date.now() + 60 * 1000);
    }
  }

  const requestPlay = (item) => {
    connection.send("RequestPlay", item.connectionId);
    setRequestingOpen(true);
  }

  const onSendMessage = async (values, from) => {
    if (!values.message) return;
    connection.send("SendMessageToClient", from.from.connectionId, values.message);
    addMessages(from.from.connectionId, from.from.name, values.message, true);
  }

  const addMessages = (connectionId, userName, message, isYourMessage) => {
    setMessages((prevMessages) => {
      const newMessages = [...prevMessages];
      const existMessage = newMessages.find(message => message.from.connectionId === connectionId);
      if (existMessage) {
        newMessages.forEach(nm => {
          if (nm.from.connectionId === connectionId) {
            nm.messages.push({
              isYourMessage: isYourMessage,
              content: message
            });
          }
        });
      } else {
        newMessages.push({
          from: {
            connectionId: connectionId,
            name: userName,
          },
          messages: [
            {
              isYourMessage: isYourMessage,
              content: message
            }
          ]
        });
      }
      return newMessages;
    });
  }

  const handleSetUserName = async (values) => {
    connection.send('SetUserName', values.userName);
  }

  const sendMessageTo = (to) => {
    if (messages.length) {
      const existMessage = messages.find(message => message.from.connectionId === to.connectionId);
      if (!existMessage) {
        setMessages((prevMes) => [...prevMes, {
          from: {
            connectionId: to.connectionId,
            name: to.userName,
          },
          messages: []
        }]);
      }
    } else {
      setMessages((prevMes) => [...prevMes, {
        from: {
          connectionId: to.connectionId,
          name: to.userName,
        },
        messages: []
      }]);
    }
  }

  const checkTimeUp = () => {
    confirm(
      "Time's up, You Lose!",
      30,
      () => {
        prepairGrid(150, 150);
        setRequestingOpen(false);
      },
      () => {
        connection.send('RejectPlayAgain', competitor.connectionId);
        prepairGrid(150, 150);
        setCompetitor(undefined);
        connection.send("UpdateStatus", true);
      },
      "Replay",
      "Exit")
    connection.send("TimesUp", competitor.connectionId);
  }

  return (
    <>
      {!isPageReady ?
        <Spin size='large' style={{ flexDirection: "row", width: "100%", height: "100vh", display: "flex", flexWrap: "nowrap", justifyContent: "center", alignItems: "center" }} tip="Loading..." >
          <span></span>
        </Spin> :
        <div className="App">
          {contextHolder}

          <Modal
            title={<Countdown title="Play Requesting" value={Date.now() + 30 * 1000} format="ss" onFinish={() => {
              setRequestingOpen(false);
            }} />}
            closeIcon={<SmileOutlined />}
            closable={false}
            open={requestingOpen}
            confirmLoading={true}
            cancelText="This is automated action, not to cancel :))"
            okText="Requesting..."
          >
            <p>Your Request will be rejected if your competitor is not response</p>
          </Modal>
          <Modal
            closable={false}
            closeIcon={<SmileOutlined />}
            open={isModalOpen}
            title="Type your name"
            okText="Create"
            cancelText="Stay here until you type your name :))"
            onOk={() => {
              nameForm
                .validateFields()
                .then((values) => {
                  handleSetUserName(values);
                  nameForm.resetFields();
                })
                .catch((info) => {
                  message.error("Your name is not valid");
                });
            }}
          >
            <Form
              form={nameForm}
              layout="vertical"
              name="form_in_modal"
              initialValues={{
                modifier: 'public',
              }}
            >
              <Form.Item
                name="userName"
                label="Your name"
                rules={[
                  {
                    required: true,
                    message: 'Please input your name!',
                  },
                  {
                    pattern: /^[^@#^*<>=+]+$/i,
                    message: 'Your name must not contain the special characters!',
                  },
                ]}
              >
                <Input />
              </Form.Item>
            </Form>
          </Modal>
          <div className='chat-bar'>
            {
              messages.map((mess, index) => {
                return chatToggles[index] ?
                  <div className='chat-card' key={mess.from.connectionId}>
                    <div className='chat-header'>
                      <div className='chat-title'>
                        {mess.from.name}
                      </div>
                      <div className='chat-icon-action' onClick={() => {
                        setChatToggles((prevToggles) => {
                          const newToggles = [...prevToggles];
                          newToggles[index] = false;
                          return newToggles;
                        });
                      }}>
                        <CaretDownOutlined />
                      </div>
                    </div>
                    <div className='chat-content'>
                      {
                        mess.messages.map(m => {
                          return m.isYourMessage ?
                            (
                              <div className='message-row' key={Math.random() * 1000}>
                                <div className='my-messages'>
                                  {m.content}
                                </div>
                              </div>
                            ) :
                            (
                              <div className='message-row' key={Math.random() * 1000}>
                                <div className='friend-messages'>
                                  {m.content}
                                </div>
                              </div>
                            )
                        }
                        )
                      }
                    </div>
                    <div className='chat-action'>
                      <Form
                        onFinish={(values) => onSendMessage(values, mess)}
                        layout='inline'
                        style={{ width: "100%" }}
                        key={Math.random() * 1000}
                      >
                        <Form.Item
                          name={"message"}
                          style={{ width: "100%" }}
                        >
                          <Input style={{ width: "100%", border: "none", boxShadow: "none" }} size='large' placeholder="Type your message" prefix={<SendOutlined />} />
                        </Form.Item>
                      </Form>
                    </div>
                  </div>
                  :
                  <div className='chat-card-closed'>
                    <div className='chat-header'>
                      <div className='chat-title'>
                        {mess.from.name}
                      </div>
                      <div className='chat-icon-action' onClick={() => setChatToggles((prevToggles) => {
                        const newToggles = [...prevToggles];
                        newToggles[index] = true;
                        return newToggles;
                      })}>
                        <CaretUpOutlined />
                      </div>
                    </div>
                  </div>
              }
              )
            }
          </div>
          {
            competitor ?
              <></>
              :
              <div className='list-players'>
                <Alert message={<span>Your name: <b>{yourName}</b></span>} type="success" style={{
                  width: "100%",
                  maxWidth: "600px"
                }}
                />
                <List
                  style={{
                    marginTop: "20px",
                    width: "100%",
                    maxWidth: "600px"
                  }}
                  size="large"
                  header={<div>List online players</div>}
                  bordered
                  dataSource={listPlayers}
                  renderItem={(item) => {
                    if (item.connectionId !== myConnectionId) {
                      return (
                        <List.Item>
                          <Button disabled={!item.isFree} type="primary" size='small' icon={<PlaySquareOutlined />} onClick={() => requestPlay(item)}>Play</Button>
                          <Button type="dashed" size='small' icon={<SendOutlined />} onClick={() => sendMessageTo(item)}>Send message</Button>
                          <div>
                            {item.userName ? item.userName : "No name"}
                          </div>
                          <div className='player-status'>
                            {item.isFree ? <span className='is-online'>Online</span> : <span className='is-playing'>Playing</span>}
                          </div>
                        </List.Item>
                      )
                    } else {
                      return <></>
                    }
                  }}
                />
              </div>
          }
          {
            competitor ?
              <div>
                <Affix offsetTop={20}>
                  <div className="control">
                    <Alert message={"You are:"} type="info" style={{ marginRight: "20px", height: "82px" }} description={currentPlayer === 1 ? <XIcon /> : <OIcon />} />
                    <Alert className={turn === 1 ? "count-down" : ""} message={turn === 1 ? <Countdown title="Your turn:" value={deadline} format="ss" onFinish={() => checkTimeUp()} /> : <Countdown title="Your competitor time:" value={deadline} format="ss" />} type={turn === 1 ? "warning" : "info"} />
                    <Button type="dashed" size='large' style={{ marginLeft: "20px", height: "82px" }} icon={<SendOutlined />} onClick={() => sendMessageTo(competitor)}>
                      Send message to {competitor.userName}
                    </Button>
                  </div>
                </Affix>

                <div class="grid">
                  <table id="game" >
                    {
                      yGridSize.map(y => (
                        <Row key={y}>
                          {
                            xGridSize.map(x => (
                              <Cell key={`${y}x${x}`} x={y} y={x} onClick={(e) => cellClick(e, y, x)} />
                            ))
                          }
                        </Row>
                      ))
                    }
                  </table>
                </div>

              </div>
              :
              <></>
          }
        </div>
      }
    </>
  );
}

export default App;
