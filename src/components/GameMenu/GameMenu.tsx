import { FC, useContext, useEffect, useRef, useState } from 'react';
import './GameMenu.css';
import { Button, Form, Input, Flex, notification } from 'antd';
import { AiOutlineSend } from "react-icons/ai";
import { StepContext, UserContext } from '../../helpers/Context';
import { Message, RoomDTO, UserDTO } from '../../models/Models';
import { getRoom, leaveRoom } from '../../services/RoomServices';
import { updateUserSlot } from '../../services/UserServices';

interface GameMenuProps extends React.HTMLAttributes<HTMLDivElement> {

}

const GameMenu: FC<GameMenuProps> = (props) => {
    const { connection, roomInfo, setRoomInfo, user, setUser } = useContext(UserContext);
    const [step, setStep] = useContext(StepContext);
    const [guest, setGuest] = useState<UserDTO>();
    const [messages, setMessages] = useState<Message[]>();
    const cLoaded = useRef<boolean>(false);
    const [api, contextHolder] = notification.useNotification();

    const getRoomInfo = async (): Promise<void> => {
        const currentRoom = await getRoom(user.roomId);
        if (currentRoom.isSuccess) {
            setRoomInfo(currentRoom.responseData);
            const guest = currentRoom.responseData.members.find((m: UserDTO) => m.sitting && !m.isRoomOwner);
            if (guest) {
                setGuest(guest);
            } else {
                setGuest(undefined);
            }
        }
    }

    useEffect(() => {
        getRoomInfo();
    }, []);

    useEffect(() => {
        if (cLoaded.current) return;

        connection.on("UserLeaved", async (userName: string): Promise<void> => {
            setMessages((prev) => {
                const newMess: Message[] = prev && prev?.length ? [...prev] : [];
                const mess: Message = {
                    userId: user.id,
                    userName: "",
                    isMyMessage: false,
                    message: `${userName} Leaved`
                }
                newMess.push(mess);
                return newMess;
            });
            await getRoomInfo();
        });

        connection.on("UserSitted", async (): Promise<void> => {
            await getRoomInfo();
        });

        connection.on("UserJoined", async (userName: string): Promise<void> => {
            setMessages((prev) => {
                const newMess: Message[] = prev && prev?.length ? [...prev] : [];
                const mess: Message = {
                    userId: user.id,
                    userName: "",
                    isMyMessage: false,
                    message: `${userName} joined`
                }
                newMess.push(mess);
                return newMess;
            });
            await getRoomInfo();
        });

        connection.on("RoomOwnerChanged", async (id: string): Promise<void> => {
            changeOwner(id);
            await getRoomInfo();
        });

        connection.on("RoomClosed", (id: string): void => {
            onRoomClosed(id);
        });
        cLoaded.current = true;
    }, []);

    const onRoomClosed = (id: string): void => {
        if (roomInfo.id === id) {
            setStep(2);
            setRoomInfo(undefined);
        }
    }

    const changeOwner = (id: string): void => {
        if (id === user.id) {
            api.info({
                message: 'Info',
                description: "the Room owner is quit, now you are room owner",
                duration: 5,
                placement: "top"
            });
        }
    }

    const onFinish = (values: any) => {
        console.log('Success:', values);
    };

    type FieldType = {
        message?: string;
    };

    const handleWhenLeave = async () => {
        const yourId = user.id;
        const isOwner: boolean = roomInfo.members.find((m: UserDTO) => m.id === yourId && m.isRoomOwner === true) ? true : false;
        const room: RoomDTO = {
            id: roomInfo.id,
            name: roomInfo.name,
            roomOwnerId: isOwner ? yourId : undefined,
            guestId: isOwner ? undefined : yourId,
            members: roomInfo.members
        }

        const res = await leaveRoom(room);

        if (res.isSuccess == true) {
            const newUser: UserDTO = user;
            newUser.roomId = "";
            newUser.sitting = false;
            newUser.isRoomOwner = false;
            setUser(newUser);
            setRoomInfo(undefined);
            setStep(2);
        } else {
            api.warning({
                message: 'Error',
                description: "Something went wrong when leaving this room",
                duration: 3,
                placement: "top"
            });
        }
    }

    const handleWhenSitting = async () => {
        console.log(user);
        if (user.isRoomOwner) {
            api.error({
                message: 'Error',
                description: "You are the room owner, you cannot sit in the guest slot!",
                duration: 3,
                placement: "top"
            });
        } else {
            if (!guest) {
                const res = await updateUserSlot(user.id, true);
                if (res.isSuccess) {
                    setGuest(user);
                } else {
                    api.error({
                        message: 'Error',
                        description: res.errorMessage,
                        duration: 3,
                        placement: "top"
                    });
                }
            } else if (guest.id === user.id) {
                const res = await updateUserSlot(user.id, false);
                if (res.isSuccess) {
                    setGuest(user);
                } else {
                    api.error({
                        message: 'Error',
                        description: res.errorMessage,
                        duration: 3,
                        placement: "top"
                    });
                }
            } else {
                api.error({
                    message: 'Error',
                    description: "Already have user",
                    duration: 3,
                    placement: "top"
                });
            }
        }
    }

    return (
        <div className='game-menu'>
            {contextHolder}
            <Flex wrap="wrap" gap="small">
                <Button type="primary" danger onClick={handleWhenLeave}>
                    Leave
                </Button>
            </Flex>
            <div className='players'>
                <div className='player'>
                    <div className='player-title'>Owner</div>
                    <div className='player-info current-user'>
                        <div className='info'>
                            <div className='avatar'>
                                <img src="human.jpg" alt="" />
                            </div>
                            <div className='player-name'>{roomInfo?.members.find((m: UserDTO) => m.isRoomOwner).userName}</div>
                        </div>
                        <div className='competition-history-info'>
                            <div className='number-of-wins'>Wins: { }</div>
                            <div className='number-of-losses'>Losses: { }</div>
                        </div>
                    </div>
                </div>
                <div className="player">
                    <div className='player-title'>Competitor</div>
                    <div className={`slot ${user.isRoomOwner ? "full" : ""} ${guest ? "joined" : ""} player-info ${guest ? "joined" : ""}`} onClick={handleWhenSitting}>
                        <div className='info'>
                            <div className='avatar'>
                                <img src="human.jpg" alt="" />
                            </div>
                            <div className='player-name'>{guest?.userName}</div>
                        </div>
                        <div className='competition-history-info'>
                            <div className='number-of-wins'>Wins: { }</div>
                            <div className='number-of-losses'>Losses: { }</div>
                        </div>
                    </div>
                </div>
            </div>
            <div className='chat-area'>
                <div className='chat-title'>Chat</div>
                <div className='chat-content'>
                    <div className='chat-messages'>
                        {
                            messages?.map((mess, i) => (
                                <div id={mess.userId + "-mess-" + i} className={mess.isMyMessage ? "my-message" : "message"}>
                                    <b>{mess.userName} </b>{mess.message}
                                </div>
                            ))
                        }
                    </div>
                </div>
                <div className='chat-input'>
                    <Form
                        name="basic"
                        style={{ width: "100%" }}
                        onFinish={onFinish}
                        autoComplete="off"
                    >
                        <Form.Item<FieldType>
                            style={{
                                width: "100%"
                            }}
                            name="message"
                            rules={[{ required: true, message: 'Please type your message!' }]}
                        >
                            <Input size='small' style={{ width: "100%", borderRadius: "8px" }} prefix={
                                <Button htmlType="submit" type='link' icon={<AiOutlineSend size={22} />} />
                            } />
                        </Form.Item>
                    </Form>
                </div>
            </div>
        </div>
    )
}

export default GameMenu;