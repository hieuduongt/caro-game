
export interface LoginDTO {
    username: string;
    password: string;
}

export interface NotificationMessage {
    id: string;
    content: string;
    type: "success" | "info" | "warning" | "error";
}

export interface MessageCardDto {
    conversatioId: string;
    userId: string;
}

export interface RegisterDTO {
    username: string;
    email: string;
    password: string;
    rePassword: string;
}

export interface ResponseData<T> {
    code: number;
    errorMessage: string[];
    responseData: T;
    isSuccess: Boolean;
}

export interface Pagination<T> {
    items?: Array<T>;
    currentPage: number;
    pageSize: number;
    totalPages: number;
    totalRecords: number;
}

export interface PaginationObject {
    currentPage: number;
    pageSize: number;
    totalPages: number;
    totalRecords: number;
}

export enum Status {
    Available,
    Unavailable
}

export enum AccountStatus {
    Active,
    Inactive,
    Banned
}

export interface RoomDTO {
    id: string;
    name: string;
    roomOwnerId?: string
    status?: Status;
    numberOfUsers?: number;
    members?: UserDTO[];
    matchs?: MatchDTO[];
    conversation: ConversationDTO;
}

export interface UserDTO {
    id: string;
    roomId: string;
    isRoomOwner: boolean;
    sitting: boolean;
    userName: string;
    email: string;
    role: RoleDTO[];
    status: AccountStatus;
    createdDate: Date;
    lastActiveDate: Date;
    isEditBy: string;
    isOnline: boolean;
    isPlaying: boolean;
    connectionId: string;
    numberOfMatchs: number;
    loseMatchs: number;
    winMatchs: number;
}

export interface RoleDTO {
    name: string;
}

export interface ConversationDTO {
    id: string;
    open: boolean;
    users: UserDTO[];
    fromUserId?: string;
    toUserId?: string;
    messages: MessageDto[];
    unRead?: boolean;
    page?: number;
    totalPages?: number;
}

export interface MessageDto {
    id?: string;
    content: string;
    userId?: string;
    toUserId?: string;
    roomId?: string;
    updatedDate?: Date;
    createdDate?: Date;
    conversationId?: string;
    conversation?: ConversationDTO;
    isNewMessage?: boolean;
}

export interface MatchDTO {
    userInMatches: UserInMatches[];
    roomId: string;
    matchId: string;
}

export interface UserInMatches {
    id: string;
    userName?: string;
    isRoomOwner: boolean;
    timeLeft?: number;
    isWinner?: boolean;
    time: any;
}

export interface GameDTO {
    Coordinates: Coordinates;
    competitorId: string;
    roomId: string;
    matchId: string;
}

export interface Coordinates {
    id?: string;
    userId: string;
    player: Player|string;
    x: number;
    y: number;
    current?: boolean;
    winPoint?: boolean;
}

export enum Player {
    PlayerX,
    PlayerO
}

export const Roles = [
    {
        color: "#f50",
        value: "admin"
    },
     {
        color: "#87d068",
        value: "manager"
    },
    {
        color: "magenta",
        value: "user"
    },
    {
        color: "",
        value: "guest"
    }
]

export enum NotificationTypes {
    StandardNotification,
    UnreadMessage
}

export interface NotificationDto {
    id?: string;
    description: string;
    notificationType?: NotificationTypes;
    user?: UserDTO;
    link: string;
    userId?: string;
    conversationId?: string;
    seen: boolean;
    fromUserId?: string;
    conversation?: ConversationDTO;
    type?: "success" | "info" | "warning" | "error";
}