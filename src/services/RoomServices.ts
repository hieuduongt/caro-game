import { EnvEnpoint } from "../helpers/Helper";
import { ActionRoomDTO, Pagination, ResponseData, RoomDTO } from "../models/Models";
import { get, post } from "./ApiCreator";

export const getAllRooms = async (search?: string, page?: number, pageSize?: number) : Promise<ResponseData<Pagination<RoomDTO>>> => {
    const url = `${EnvEnpoint()}/api/Game/room/all?search=${search}&page=${page || 1}&pageSize=${pageSize || 20}`;
    return get<Pagination<RoomDTO>>(url);
}

export const getRoom = async (id: string) : Promise<ResponseData<RoomDTO>> => {
    const url = `${EnvEnpoint()}/api/Game/room/${id}`;
    return get<RoomDTO>(url);
}

export const getRoomByUser = async (id: string) : Promise<ResponseData<RoomDTO>> => {
    const url = `${EnvEnpoint()}/api/Game/room-by-user/${id}`;
    return get<RoomDTO>(url);
}

export const joinRoom = async (data: ActionRoomDTO) : Promise<ResponseData<undefined>> => {
    const url = `${EnvEnpoint()}/api/Game/join-room`;
    return post(url, data);
}

export const leaveRoom = async (data: ActionRoomDTO) : Promise<ResponseData<undefined>> => {
    const url = `${EnvEnpoint()}/api/Game/leave-room`;
    return post<undefined>(url, data);
}

export const updateSitting = async (roomId: string, userId: string, isSitting: boolean, isKicked?: boolean) : Promise<ResponseData<undefined>> => {
    const url = `${EnvEnpoint()}/api/Game/sitting?roomId=${roomId}&userId=${userId}&isSitting=${isSitting}&isKicked=${isKicked}`;
    return post<undefined>(url);
}

export const createRoom = async (data: RoomDTO) : Promise<ResponseData<RoomDTO>> => {
    const url = `${EnvEnpoint()}/api/Game/create-room`;
    return post<RoomDTO>(url, data);
}