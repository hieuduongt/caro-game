import { FC, useEffect, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import './App.css';
import { notification, Spin, Popover, Button, Avatar, Alert, Space, Badge, Drawer, List, Skeleton } from 'antd';
import { LoadingOutlined, AlertOutlined, MessageOutlined } from '@ant-design/icons';
import * as signalR from "@microsoft/signalr";
import { AppContext } from './helpers/Context';
import InGame from './components/Ingame/Ingame';
import Home from './components/Home/Home';
import InfiniteScroll from 'react-infinite-scroll-component';
import RoomList from './components/RoomList/RoomList';
import { EnvEnpoint, generateShortUserName, getAuthToken, getTokenProperties, isExpired, removeAuthToken } from './helpers/Helper';
import { getUser } from './services/UserServices';
import { Coordinates, MatchDTO, RoomDTO, ConversationDTO, UserDTO, NotificationDto, NotificationTypes, MessageCardDto, MessageDto, PaginationObject, NewMessageModel } from './models/Models';
import { createConversation, getAllConversations, getConversationToUser } from './services/ChatServices';
import { SystemString } from './common/StringHelper';
import { updateConversationNotificationsToSeen } from './services/NotificationServices';
import MessageCard from './components/MessageCard/MessageCard';

const App: FC = () => {
  const [api, contextHolder] = notification.useNotification();
  const [loading, setLoading] = useState<boolean>(false);
  const [isConnected, setConnected] = useState<boolean>(false);
  const [yourTurn, setYourTurn] = useState<boolean>(false);
  const [newGame, setNewGame] = useState<number>(0);
  const [newMessage, setNewMessage] = useState<NewMessageModel>({index: 0, id: ""});
  const [start, setStart] = useState<boolean>(false);
  const [watchMode, setWatchMode] = useState<boolean>(false);
  const cLoaded = useRef<boolean>(false);
  const [connection, setConnection] = useState<signalR.HubConnection>();
  const [step, setStep] = useState<number>(0);
  const [user, setUser] = useState<UserDTO>();
  const [redirectToLogin, setRedirectToLogin] = useState<boolean>(false);
  const [roomInfo, setRoomInfo] = useState<RoomDTO>();
  const [matchInfo, setMatchInfo] = useState<MatchDTO>();
  const [listCoordinates, setListCoordinates] = useState<Coordinates[]>();
  const [messageCards, setMessageCards] = useState<MessageCardDto[]>([]);
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [openNotificationPanel, setOpenNotificationPanel] = useState<boolean>(false);
  const [openConversationPanel, setOpenConversationPanel] = useState<boolean>(false);
  const [allConversations, setAllConversations] = useState<ConversationDTO[]>([]);
  const [conversationLoading, setConversationLoading] = useState<boolean>(false);
  const [conversationPage, setConversationPage] = useState<PaginationObject>({
    currentPage: 1,
    totalPages: 0,
    pageSize: 20,
    totalRecords: 0
  });

  const checkIsLoggedIn = async (): Promise<void> => {
    setLoading(true);
    const token = getAuthToken();
    if (token) {
      const isExp = isExpired();
      if (isExp) {
        removeAuthToken();
        setRedirectToLogin(true);
        setStep(1);
        setLoading(false);
      } else {
        await connectToGameHub();
      }
    } else {
      setStep(1);
      setLoading(false);
    }
  }

  const connectToGameHub = async () => {
    const hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(`${EnvEnpoint()}/connection/hub/game`, {
        accessTokenFactory: () => getAuthToken(),
        skipNegotiation: true,
        transport: signalR.HttpTransportType.WebSockets,
        withCredentials: true
      })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Debug)
      .build();
    hubConnection.start().then(async () => {
      setConnection(hubConnection);
      setConnected(true);
      await getAllConversationsWhenOpen();
    }).catch((error) => {
      api.error({
        message: 'Connect Failed',
        description: SystemString.CannotConnectToServer,
        duration: -1,
        placement: "top"
      });
      const newNotification: NotificationDto = {
        id: uuidv4(),
        description: SystemString.CannotConnectToServer,
        notificationType: NotificationTypes.StandardNotification,
        seen: false,
        link: ""
      }
      addNewNotifications(newNotification, "error");
      setLoading(false);
    });
  }

  const checkIfIsInRoom = async (): Promise<boolean> => {
    const id = getTokenProperties("nameidentifier");
    const res = await getUser(id);
    if (res.isSuccess && res.responseData) {
      const currentUser: UserDTO = {
        id: res.responseData.id,
        userName: res.responseData.userName,
        roomId: res.responseData.roomId,
        email: res.responseData.email,
        isRoomOwner: res.responseData.isRoomOwner,
        role: res.responseData.role,
        sitting: res.responseData.sitting,
        status: res.responseData.status,
        createdDate: res.responseData.createdDate,
        isEditBy: res.responseData.isEditBy,
        lastActiveDate: res.responseData.lastActiveDate,
        isPlaying: res.responseData.isPlaying,
        isOnline: res.responseData.isOnline,
        connectionId: res.responseData.connectionId,
        loseMatchs: res.responseData.loseMatchs,
        numberOfMatchs: res.responseData.numberOfMatchs,
        winMatchs: res.responseData.winMatchs
      }
      setUser(currentUser);
      return res.responseData.roomId ? true : false;
    } else {
      const newNotification: NotificationDto = {
        id: uuidv4(),
        description: res.errorMessage.toString(),
        notificationType: NotificationTypes.StandardNotification,
        seen: false,
        link: ""
      }
      addNewNotifications(newNotification, "error");
      return false;
    }
  }

  const logOut = (): void => {
    setUser(undefined);
    removeAuthToken();
    setStep(1);
    connection?.stop();
    setConnected(false);
    setConnection(undefined);
    window.location.reload();
  }

  useEffect((): any => {
    if (cLoaded.current)
      return
    checkIsLoggedIn();
    cLoaded.current = true;
  }, []);

  useEffect(() => {
    if (isConnected) {
      checkIfIsInRoom().then(res => {
        if (res) {
          setStep(3);
        } else {
          setStep(2);
        }
        setLoading(false);
      });
    }
  }, [isConnected]);

  useEffect(() => {
    if (connection) {
      connection.on("NewNotification", (data: NotificationDto) => {
        addNewNotifications(data, 'info');
      });

      connection.on("NewPersonalMessage", (data: MessageDto) => {
        setNewMessage(prev => ({index: prev.index + 1, id: data.toUserId!}));
      });
    }
  }, [connection]);

  useEffect(() => {
    handleWhenOpeningNewConversation(newMessage.id);
  }, [newMessage]);

  const getAllConversationsWhenOpen = async () => {
    if (conversationLoading) {
      return;
    }
    setConversationLoading(true);
    const result = await getAllConversations("", 1, 20);
    if (result.isSuccess && result.responseData.items && result.responseData.items.length) {
      const newData: ConversationDTO[] = [...result.responseData.items];
      setConversationLoading(false);
      setAllConversations(newData);
      setConversationPage({currentPage: result.responseData.currentPage, pageSize: result.responseData.pageSize, totalPages: result.responseData.totalPages, totalRecords: result.responseData.totalRecords});
    } else {
      addNewNotifications(result.errorMessage, "error");
      setConversationLoading(false);
    }
  }

  const loadMoreConversation = async () => {
    if (conversationLoading) {
      return;
    }
    setConversationLoading(true);
    const result = await getAllConversations("", conversationPage.currentPage + 1, 20);
    if (result.isSuccess && result.responseData.items && result.responseData.items.length) {
      const newData: ConversationDTO[] = [...result.responseData.items];
      setConversationLoading(false);
      setAllConversations(prev => [...prev, ...newData]);
      setConversationPage({currentPage: result.responseData.currentPage, pageSize: result.responseData.pageSize, totalPages: result.responseData.totalPages, totalRecords: result.responseData.totalRecords});
    } else {
      addNewNotifications(result.errorMessage, "error");
      setConversationLoading(false);
    }
  }

  const handleWhenOpeningNewConversation = async (toUserId: string) => {
    let newMcs = [...messageCards];
    const currentMC = newMcs.some((c: MessageCardDto) => c.userId === toUserId);
    if (!currentMC) {
      let newMessageCard: MessageCardDto = {
        conversatioId: "",
        userId: ""
      };
      const res = await getConversationToUser(toUserId);
      if (res.isSuccess) {
        if (res.responseData) {
          const updateNotiRes = await updateConversationNotificationsToSeen(res.responseData.id);
          if (!updateNotiRes.isSuccess) {
            addNewNotifications(updateNotiRes.errorMessage, "error");
          } else {
            newMessageCard.conversatioId = res.responseData.id;
            newMessageCard.userId = toUserId;
            console.log(messageCards);
            newMcs.push(newMessageCard);
          }
        } else {
          const createNewConvRes = await createConversation(toUserId);
          if (createNewConvRes.isSuccess) {
            newMcs.push({ conversatioId: createNewConvRes.responseData.id, userId: toUserId });
          } else {
            addNewNotifications(createNewConvRes.errorMessage, "error");
          }
        }
      } else {
        addNewNotifications(res.errorMessage, "error");
      }
    }

    console.log(newMcs);
    setMessageCards(newMcs);
  }

  console.log(messageCards)

  const handleCloseErrorMessage = (id: string) => {
    const filteredNotifications = [...notifications].filter(p => p.id !== id);
    setNotifications(filteredNotifications);
    if (!filteredNotifications.length) setOpenNotificationPanel(false);
  }

  const addNewNotifications = (data: NotificationDto | NotificationDto[] | string | string[], type: "success" | "info" | "warning" | "error") => {
    if (Array.isArray(data)) {
      if (typeof data[0] === "string" && typeof data[0] !== "object") {
        const notificationMessages = data.map(d => {
          const noti: NotificationDto = {
            id: uuidv4(),
            description: d.toString(),
            type: type,
            link: "",
            seen: false
          };
          return noti;
        });
        setNotifications(prev => [...prev, ...notificationMessages]);
      } else {
        const newData: NotificationDto[] = [...data as NotificationDto[]];
        newData.forEach(d => {
          d.type = type;
          if (!d.id) {
            d.id = uuidv4();
          }
        });
        setNotifications(prev => [...prev, ...newData]);
      }
    } else {
      if (typeof data === "string") {
        const notiId = uuidv4();
        setNotifications(prev => [...prev, {
          id: notiId,
          description: data,
          type: type,
          seen: false,
          link: ""
        }]);
      } else {
        const newData: NotificationDto = data as NotificationDto;
        newData.type = type;
        newData.id = newData.id || uuidv4();
        setNotifications(prev => [...prev, newData]);
      }
    }
  }

  const handleWhenOpenConversationPanel = () => {
    setOpenConversationPanel(true);
  }

  const handleCloseMessageCard = (conversationId: string) => {
    setMessageCards(prev => {
      const newMCs = [...prev];
      const returnMCs = newMCs.filter(m => m.conversatioId !== conversationId);
      return returnMCs;
    })
  }

  return (
    <>
      <div className="header-panel">
        <div className="header">
          <div className="author">
            <div>
              <Avatar src={<img src="app-logo.PNG" style={{ width: "100%", height: "100%" }} />} style={{ verticalAlign: 'middle', boxShadow: "rgba(0, 0, 0, 0.05) 0px 6px 24px 0px, rgba(0, 0, 0, 0.08) 0px 0px 0px 1px" }} size={40} />
            </div>

            <div className="link-to">
              Powered by
              <a href="https://www.hieuduongit.com/" target='_blank'> HieuduongIT.com</a>
            </div>
          </div>
          <div className="notifications">
            {notifications[notifications.length - 1] ?
              <Alert
                key={notifications[notifications.length - 1].id}
                banner
                closable
                message={<div style={{ width: "100%" }} onClick={() => setOpenNotificationPanel(true)}>{notifications[notifications.length - 1].description}</div>}
                type={notifications[notifications.length - 1].type}
                onClose={() => handleCloseErrorMessage(notifications[notifications.length - 1].id || "")}
              />
              :
              <></>
            }
          </div>

          <Badge count={notifications.length} size='small' style={{ cursor: "pointer" }} >
            <Button type="default" shape="circle" size='small' danger={!!notifications.length} icon={<AlertOutlined />} onClick={() => setOpenNotificationPanel(prev => !prev)} />
          </Badge>
          {user ?
            <Badge count={allConversations.filter(c => c.unRead).length} size='small' style={{ cursor: "pointer" }} >
              <Button type="default" shape="circle" size='small' icon={<MessageOutlined />} onClick={handleWhenOpenConversationPanel} />
            </Badge>
            :
            <></>
          }

          {
            user ? <div className='profile'>
              <Popover placement="bottomLeft" title={""} content={
                <div style={{ display: "flex", flexDirection: "column", flexWrap: "nowrap", justifyContent: "center", alignItems: "center" }}>
                  <div>Hello {user.userName}</div>
                  <div className='match-info'>
                    <div><b>Matchs:</b> <span style={{ color: "#4096ff", fontWeight: "bold" }}>{user.numberOfMatchs}</span></div>
                    <div><b>Win/Lose:</b> <span style={{ color: "#52c41a", fontWeight: "bold" }}>{user.winMatchs}</span>/<span style={{ color: "#FA541C", fontWeight: "bold" }}>{user.numberOfMatchs - user.winMatchs || 0}</span></div>
                  </div>
                  <Button type="link">Your profile</Button>
                  <Button type="dashed" onClick={logOut}>Log out</Button>
                </div>
              } trigger="click">
                <Avatar style={{ verticalAlign: 'middle', cursor: "pointer", backgroundColor: "#87d068" }} className='user-profile' size={40} gap={2}>
                  {generateShortUserName(user.userName)}
                </Avatar>
              </Popover>

            </div>
              :
              <div className='profile'>
                <Avatar src={<img src="favicon.png" style={{ width: "100%", height: "100%" }} />} size={40} style={{ verticalAlign: 'middle' }} />
              </div>
          }

        </div>
      </div>

      <div className='container'>
        {contextHolder}
        {
          loading ? <Spin indicator={<LoadingOutlined style={{ fontSize: 50 }} spin />} fullscreen /> :
            <AppContext.Provider value={{
              user,
              setUser,
              redirectToLogin,
              setRedirectToLogin,
              connection,
              setConnection,
              roomInfo,
              setRoomInfo,
              matchInfo,
              setMatchInfo,
              listCoordinates,
              setListCoordinates,
              step,
              setStep,
              yourTurn,
              setYourTurn,
              start,
              setStart,
              newGame,
              setNewGame,
              watchMode,
              setWatchMode,
              addNewNotifications
            }}>
              {step === 1 ? <Home redirectToLogin={redirectToLogin} connectToGameHub={connectToGameHub} /> : <></>}
              {step === 2 ? <RoomList handleWhenOpeningNewConversation={handleWhenOpeningNewConversation} /> : <></>}
              {step === 3 ? <InGame /> : <></>}
              <Drawer
                title="Your Conversations"
                placement="right"
                width={400}
                onClose={() => setOpenConversationPanel(false)}
                open={openConversationPanel}
              >
                <div
                  id="scrollableDiv"
                  style={{
                    height: 400,
                    overflow: 'auto',
                    padding: '0 16px',
                    border: '1px solid rgba(140, 140, 140, 0.35)',
                  }}
                >
                  <InfiniteScroll
                    dataLength={allConversations.length}
                    next={loadMoreConversation}
                    hasMore={conversationPage.currentPage < conversationPage.totalPages}
                    loader={<Skeleton avatar paragraph={{ rows: 1 }} active />}
                    scrollableTarget="scrollableDiv"
                  >
                    <List
                      bordered={false}
                      dataSource={allConversations}
                      renderItem={(item) => (
                        <List.Item
                          key={item.id}
                          style={{ border: "none", padding: 12 }}
                          className={`conversation-li`}
                          onClick={() => {
                            handleWhenOpeningNewConversation(item.users.find(u => u.id !== user?.id)?.id!);
                            setOpenConversationPanel(false);
                          }}
                        >
                          <List.Item.Meta
                            avatar={<Avatar src={item.users[0].userName} />}
                            title={item.users.find(u => u.id !== user?.id)?.userName}
                            description={item.messages![0]?.content}
                            className={`conversation-item ${item.unRead ? "unread" : ""}`}
                          />
                          <div className='badge'></div>
                        </List.Item>
                      )}
                    />
                  </InfiniteScroll>
                </div>
              </Drawer>
            </AppContext.Provider>
        }
        <div className="message-bar">
          {
            messageCards.map(ms => (
              <MessageCard
                conversationId={ms.conversatioId}
                handleCloseMessageCard={handleCloseMessageCard}
                connection={connection} user={user!}
                addNewNotifications={addNewNotifications}
              />
            ))
          }
        </div>

      </div >
      <Drawer
        title="Notifications"
        placement="right"
        width={400}
        onClose={() => setOpenNotificationPanel(false)}
        open={openNotificationPanel}
        extra={
          <Space>
            <Button type="link" onClick={() => {
              setNotifications([]);
              setOpenNotificationPanel(false);
            }}>
              Dismiss All
            </Button>
          </Space>
        }
      >
        <div className='list-errors'>
          {
            notifications.map(nt => {
              return (
                <Alert
                  key={nt.id}
                  banner
                  closable
                  message={nt.description}
                  type={nt.type}
                  onClose={() => handleCloseErrorMessage(nt.id || "")}
                />
              )
            })
          }
        </div>
      </Drawer>
    </>
  );
}

export default App;
