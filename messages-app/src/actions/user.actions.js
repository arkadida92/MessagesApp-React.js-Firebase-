import { userConstants } from "./constants"
import firebase from 'firebase'

const { firestore } = firebase

export const getRealtimeUsers = (uid) => {
    return async dispatch => {
        dispatch({ type: `${userConstants.GET_REALTIME_USERS}_REQUEST` })

        const db = firestore()
        const unsubscribe = db.collection("users")
            .onSnapshot((querySnapshot) => {
                const users = [];
                querySnapshot.forEach(function (doc) {
                    if (doc.data().uid !== uid) {
                        users.push(doc.data());
                    }

                });
                //console.log(users);

                dispatch({
                    type: `${userConstants.GET_REALTIME_USERS}_SUCCESS`,
                    payload: { users }
                })
            });

        return unsubscribe

    }
}

export const updateMessage = msgObj => {
    return async dispatch => {
        const db = firestore()
        db.collection('conversations')
            .add({
                ...msgObj,
                isView: false,
                createdAt: new Date()
            })
            .then(data => {
                console.log(data)
            })
            .catch(err => {
                console.log(err)
            })
    }
}

export const getRealtimeConversations = (user) => {
    return async dispatch => {
        const db = firestore()
        db.collection('conversations')
            .where('user_uid_1', 'in', [user.uid_1, user.uid_2])
            .orderBy('createdAt', 'asc')
            .onSnapshot(querySnapshot => {

                const conversations = []

                querySnapshot.forEach(doc => {

                    if ((doc.data().user_uid_1 === user.uid_1 && doc.data().user_uid_2 === user.uid_2) ||
                        (doc.data().user_uid_1 === user.uid_2 && doc.data().user_uid_2 === user.uid_1)) {
                        conversations.push(doc.data())
                    }
                })

                // if (conversations.length > 0) {
                dispatch({
                    type: userConstants.GET_REALTIME_MESSAGES,
                    payload: { conversations }
                })
                // }
                // else {
                //     dispatch({
                //         type: `${userConstants.GET_REALTIME_MESSAGES}_FAILURE`,
                //         payload: { conversations }
                //     })
                // }

            })
    }
}

export const blockUser = (currentUid, uid) => {
    return async dispatch => {
        const db = firestore()
        const blockedUsers = db.collection('blockedUsers').doc(currentUid)
        const alreadyBlocked = await blockedUsers.get()

        if (alreadyBlocked.exists) {
            const blockedArr = alreadyBlocked.get('blockedUsers')
            if (!blockedArr.includes(uid)) {
                db.collection('blockedUsers')
                    .doc(currentUid)
                    .set({ blockedUsers: [...blockedArr, uid] })
            }
        } else {
            db.collection('blockedUsers')
                .doc(currentUid)
                .set({ blockedUsers: [uid] })
        }

    }
}

export const unblockUser = (currentUid, uid) => {
    return async dispatch => {
        const db = firestore()
        const blockedUsers = db.collection('blockedUsers').doc(currentUid)
        const alreadyBlocked = await blockedUsers.get()

        if (alreadyBlocked.exists) {
            const blockedArr = alreadyBlocked.get('blockedUsers')
            if (blockedArr.includes(uid)) {
                let newBlockedArr = blockedArr.filter(uid2 => uid !== uid2)
                db.collection('blockedUsers')
                    .doc(currentUid)
                    .set({ blockedUsers: newBlockedArr })
            }
        }
    }
}

export const isUserBlocked = (currentUid, uid) => {
    return async dispatch => {
        const db = firestore()
        const blockedUsers = db.collection('blockedUsers').doc(currentUid)
        const alreadyBlocked = await blockedUsers.get()
        if (alreadyBlocked.exists) {
            const blockedArr = alreadyBlocked.get('blockedUsers')
            if (blockedArr.includes(uid)) {
                return true
            }
        }

        return false
    }
}

export const getRealtimeGroups = (uid) => {
    return async dispatch => {
        dispatch({ type: `${userConstants.GET_REALTIME_GROUPS}_REQUEST` })

        const db = firestore()
        const unsubscribe = db.collection("groups")
            .onSnapshot((querySnapshot) => {
                const groups = [];
                querySnapshot.forEach(function (doc) {
                    if (doc.data().participants.includes(uid)) {
                        groups.push(doc.data());
                    }

                });
                //console.log(groups);

                dispatch({
                    type: `${userConstants.GET_REALTIME_GROUPS}_SUCCESS`,
                    payload: { groups }
                })
            });

        return unsubscribe

    }
}

export const createGroupChat = (usersArr, groupName) => {
    return async dispatch => {
        const db = firestore()
        db
            .collection('groups')
            .add({
                groupName,
                participants: usersArr,
                createdAt: new Date(),
                groupId: ''
            }).then(async data => {
                await db.collection('groups').doc(data.id).update({ groupId: data.id })

                usersArr.forEach(async uid => {
                    let groupsArr = await db.collection('usersGroups').doc(uid).get('groupsList')
                    if (groupsArr.exists) {
                        console.log(groupsArr.data().groupsList)
                        db
                            .collection('usersGroups')
                            .doc(uid)
                            .update({ groupsList: [...groupsArr.data().groupsList, data.id] })
                    }
                    else {
                        db
                            .collection('usersGroups')
                            .doc(uid)
                            .set({ groupsList: [data.id] })
                    }
                })

            })
    }
}

export const sendGroupMessage = (uid, groupId, msg) => {
    return async dispatch => {
        const message = {
            userId: uid,
            groupId,
            message: msg,
            createdAt: new Date()
        }

        const db = firestore()
        db
            .collection('groupsMessages')
            .add(message)
    }
}

export const leaveGroupChat = (uid, groupId) => {
    return async dispatch => {
        const db = firestore()
        let participants = await (await db.collection('groups').doc(groupId).get()).data().participants
        participants = participants.filter(uid2 => uid2 !== uid)

        db
            .collection('groups')
            .doc(groupId)
            .update({ participants })

        let groupsList = await (await db.collection('usersGroups').doc(uid).get()).data().groupsList
        groupsList = groupsList.filter(groupId2 => groupId2 !== groupId)

        db
            .collection('usersGroups')
            .doc(uid)
            .update({ groupsList })

        dispatch({
            type: userConstants.GET_REALTIME_GROUP_MESSAGES,
            payload: { groupConversations: [] }
        })

        dispatch({
            type: `${userConstants.REMOVE_REALTIME_GROUP}`,
            payload: { groupId }
        })
    }
}

export const getRealtimeChatConversations = (group) => {
    return async dispatch => {
        const db = firestore()
        db.collection('groupsMessages')
            .where('groupId', '==', group.groupId)
            .orderBy('createdAt', 'asc')
            .onSnapshot(querySnapshot => {

                const conversations = []

                querySnapshot.forEach(doc => {
                    conversations.push(doc.data())
                })

                if (conversations.length > 0) {
                    dispatch({
                        type: userConstants.GET_REALTIME_GROUP_MESSAGES,
                        payload: { groupConversations: conversations }
                    })
                }
                else {
                    dispatch({
                        type: `${userConstants.GET_REALTIME_GROUP_MESSAGES}_FAILURE`,
                        payload: { groupConversations: conversations }
                    })
                }
            })
    }
}