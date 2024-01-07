import { FC, useContext, useEffect, useRef, useState } from "react";
import './RoomList.css';
import { Modal, Form, Button, Input, notification, Table, Tag } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { PlusOutlined } from '@ant-design/icons';
import { RoomDTO, UserDTO, Pagination, Status } from "../../models/Models";
import { createRoom, getAllRooms, joinRoom } from "../../services/RoomServices";
import { StepContext, UserContext } from "../../helpers/Context";
import { getTokenProperties } from "../../helpers/Helper";
import { getAllUsers } from "../../services/UserServices";
import type { ColumnsType } from 'antd/es/table';
import { GiRoundTable } from "react-icons/gi";
const { Search } = Input;
interface RoomListProps extends React.HTMLAttributes<HTMLDivElement> {

}

const RoomList: FC<RoomListProps> = (props) => {
    const [roomCreationForm] = Form.useForm<RoomDTO>();
    const [step, setStep] = useContext(StepContext);
    const { setRedirectToLogin, connection, setRoomInfo, user, setUser } = useContext(UserContext);
    const [listRooms, setListRooms] = useState<Pagination<RoomDTO>>();
    const [roomSearchKeywords, setRoomSearchKeywords] = useState<string>("");
    const [listUsers, setListUsers] = useState<Pagination<UserDTO>>();
    const [userSearchKeywords, setUserSearchKeywords] = useState<string>("");
    const [openCreateRoom, setOpenCreateRoom] = useState<boolean>(false);
    const [reloadState, setReloadState] = useState<boolean>(false);
    const [isCreating, setIsCreating] = useState<boolean>(false);
    const [api, contextHolder] = notification.useNotification();
    const cLoaded = useRef<boolean>(false);

    const roomColumns: ColumnsType<RoomDTO> = [
        {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
            render: (text) => <a>{text}</a>,
            sorter: (a, b) => {
                if ( a.name < b.name ){
                    return -1;
                  }
                  if ( a.name > b.name ){
                    return 1;
                  }
                  return 0;
            },
            sortDirections: ['descend', 'ascend']
        },
        {
            title: 'Members in room',
            dataIndex: 'numberOfUsers',
            key: 'numberOfUsers',
        },
        {
            title: 'Status',
            key: 'status',
            dataIndex: 'status',
            render: (status: Status) => {
                let color = "error";
                if (status === Status.Available) {
                    color = "green";
                }
                return (
                    <Tag color={color} key={"status"}>
                        {Status[status].toUpperCase()}
                    </Tag>
                );
            }
        },
        {
            title: 'Action',
            key: 'action',
            render: (_, record) => (
                <a type="text" onClick={() => handleJoin(record)}>Join {record.name}</a>
            ),
        },
    ];

    const userColumns: ColumnsType<UserDTO> = [
        {
            title: 'Name',
            dataIndex: 'userName',
            key: 'userName',
            render: (text) => <a>{text}</a>,
            sorter: (a, b) => {
                if ( a.userName < b.userName ){
                    return -1;
                  }
                  if ( a.userName > b.userName ){
                    return 1;
                  }
                  return 0;
            },
            sortDirections: ['descend', 'ascend']
        },
        {
            title: 'Role',
            dataIndex: 'role',
            key: 'role'
        },
        {
            title: 'Status',
            key: 'isOnline',
            dataIndex: 'isOnline',
            sorter: (a, b) => a.isOnline.toString().length - b.isOnline.toString().length,
            sortDirections: ['descend', 'ascend'],
            render: (status: boolean) => {
                let color = "error";
                if (status) {
                    color = "green";
                }
                return (
                    <Tag color={color} key={"status"}>
                        {
                            status ? "Online" : "Offline"
                        }
                    </Tag>
                );
            }
        },
        {
            title: 'Action',
            key: 'action',
            render: (_, record) => (
                <a>Chat</a>
            )
        },
    ];

    const getListRooms = async (search?: string, page?: number, pageSize?: number): Promise<void> => {
        const res = await getAllRooms(search, page, pageSize);
        if (res.isSuccess == true) {
            setListRooms(res.responseData);
        }
        if (res.isSuccess == false && res.code == 401) {
            setStep(1);
            setRedirectToLogin(true);
        }
    }

    const getListUsers = async (search?: string, page?: number, pageSize?: number): Promise<void> => {
        const res = await getAllUsers(search, page, pageSize);
        if (res.isSuccess == true) {
            setListUsers(res.responseData);
        }
        if (res.isSuccess == false && res.code == 401) {
            setStep(1);
            setRedirectToLogin(true);
        }
    }

    useEffect(() => {
        getListRooms(roomSearchKeywords, 1, 20);
        getListUsers(userSearchKeywords, 1, 20);
    }, []);

    useEffect(() => {
        if (cLoaded.current) return;
        if (connection) {
            connection.on("RoomCreated", async () => {
                await getListRooms(roomSearchKeywords, 1, 20);
            });
            connection.on("UserLoggedIn", async (message: string) => {
                await getListUsers(userSearchKeywords, 1, 20);
            });
            connection.on("UserLoggedOut", async (message: string) => {
                await getListUsers(userSearchKeywords, 1, 20);
            });

            connection.on("RoomClosed", async () => {
                await getListRooms(roomSearchKeywords, 1, 20);
            });
        }
        cLoaded.current = true;
    }, [connection, reloadState]);

    const handleCreate = async (): Promise<void> => {
        roomCreationForm
            .validateFields()
            .then(async (values) => {
                setIsCreating(true);
                const result = await createRoom(values);
                if (result.code === 200 && result.isSuccess) {
                    roomCreationForm.resetFields();
                    const roomInfo: RoomDTO = result.responseData;
                    setUser({ ...user, roomId: roomInfo.id, isRoomOwner: true, sitting: true, isOnline: true });
                    setRoomInfo(roomInfo);
                    setStep(3);
                    setOpenCreateRoom(false);
                    setIsCreating(false);
                } else {
                    for (let it of result.errorMessage) {
                        api.error({
                            message: 'Create Failed',
                            description: it,
                            duration: -1,
                            placement: "top"
                        })
                    }
                    setIsCreating(false);
                }
            })
            .catch((info) => {
                setIsCreating(false);
            });
    }

    const handleJoin = async (room: RoomDTO): Promise<void> => {
        const currentRoom: RoomDTO = {
            id: room.id,
            name: room.name,
            guestId: user.id
        }
        const newUser: UserDTO = user;
        newUser.roomId = room.id;
        setUser(newUser);
        const res = await joinRoom(currentRoom);
        if (res.isSuccess) {
            setStep(3);
        }
    }

    const handleWhenSearchRoom = async (value: string, event?: React.ChangeEvent<HTMLInputElement> | React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLInputElement>, info?: {
        source?: 'clear' | 'input';
    }): Promise<void> => {

        if (value && info?.source === "input") {
            await getListRooms(value, 1, 20);
            setRoomSearchKeywords(value);
        }

        if (info?.source === "clear") {
            await getListRooms("", 1, 20);
            setRoomSearchKeywords("");
        }
    }

    const handleWhenSearchUser = async (value: string, event?: React.ChangeEvent<HTMLInputElement> | React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLInputElement>, info?: {
        source?: 'clear' | 'input';
    }): Promise<void> => {
        if (info?.source === "input") {
            await getListUsers(value || "", 1, 20);
            setUserSearchKeywords(value || "");
        }

        if (info?.source === "clear") {
            await getListUsers("", 1, 20);
            setUserSearchKeywords("");
        }
    }

    const handleWhenUserPaginationChange = async (page: number, pageSize: number): Promise<void> => {
        await getListUsers(userSearchKeywords, page, pageSize);
    }

    const handleWhenRoomPaginationChange = async (page: number, pageSize: number): Promise<void> => {
        await getListRooms(roomSearchKeywords, page, pageSize);
    }

    return (
        <div className='in-room-container'>
            {contextHolder}
            <div className="room-container">
                <div className="list-rooms">
                    <Table
                        columns={roomColumns}
                        dataSource={listRooms?.items}
                        pagination={{ position: ["bottomCenter"], pageSize: listRooms?.pageSize, current: listRooms?.currentPage, total: listRooms?.totalRecords, onChange: handleWhenRoomPaginationChange }}
                        title={() =>
                            <>
                                <Button type="primary" icon={<PlusOutlined />} size="large" onClick={() => setOpenCreateRoom(true)}>
                                    New room
                                </Button>
                                <Search className="input-search-room" addonBefore={<GiRoundTable size={22} />} placeholder="input room name" allowClear size="large" onSearch={handleWhenSearchRoom} />
                            </>}
                        scroll={{ y: 550 }}
                    />
                </div>
                <div className="list-users">
                    <Table
                        pagination={{ position: ["bottomCenter"], pageSize: listUsers?.pageSize, current: listUsers?.currentPage, total: listUsers?.totalRecords, onChange: handleWhenUserPaginationChange }}
                        columns={userColumns}
                        dataSource={listUsers?.items}
                        title={() =>
                            <>
                                <Search className="input-search-user" addonBefore={<UserOutlined />} placeholder="input user name" allowClear size="large" onSearch={handleWhenSearchUser} />
                            </>}
                        scroll={{ y: 550 }}
                    />
                </div>
            </div>

            <Modal
                open={openCreateRoom}
                title="Create a new room"
                okText="Create"
                cancelText="Cancel"
                onCancel={() => { setOpenCreateRoom(false); setIsCreating(false); }}
                onOk={handleCreate}
                confirmLoading={isCreating}
                okButtonProps={{ htmlType: "submit" }}
            >
                <Form
                    form={roomCreationForm}
                    layout="horizontal"
                    name="create-room-form"
                    labelCol={{ span: 8 }}
                    wrapperCol={{ span: 16 }}
                >
                    <Form.Item
                        name="name"
                        label="Room Name"
                        rules={[{ required: true, message: 'Please input your room name' }]}
                    >
                        <Input type="text" />
                    </Form.Item>
                    <Form.Item
                        initialValue={getTokenProperties("nameidentifier")}
                        name="roomOwnerId"
                        label="Room Owner"
                        hidden
                        rules={[{ required: true, message: 'Please input your room owner' }]}
                    >
                        <Input type="text" />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    )
}

export default RoomList;