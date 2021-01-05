import firebase from 'firebase'
import { authConstant } from './constants'

const { firestore, auth } = firebase

export const signup = (user) => {
    return async (dispatch) => {
        const db = firestore()

        dispatch({ type: `${authConstant.USER_LOGIN}_REQUEST` })

        auth()
            .createUserWithEmailAndPassword(user.email, user.password)
            .then(data => {
                console.log(data)
                const currentUser = auth().currentUser
                const name = `${user.firstName} ${user.lastName}`
                currentUser.updateProfile({
                    displayName: name
                })
                    .then(() => {
                        db.collection('users')
                            .doc(data.user.uid)
                            .set({
                                firstName: user.firstName,
                                lastName: user.lastName,
                                uid: data.user.uid,
                                createdAt: new Date(),
                                isOnline: true
                            })
                            .then(() => {
                                const loggedInUser = {
                                    firstName: user.firstName,
                                    lastName: user.lastName,
                                    uid: data.user.uid,
                                    email: user.email
                                }
                                localStorage.setItem('user', JSON.stringify(loggedInUser))
                                console.log('User logged in successfully...')
                                dispatch({
                                    type: `${authConstant.USER_LOGIN}_SUCCESS`,
                                    payload: { user: loggedInUser }
                                })
                            })
                            .catch((err) => {
                                console.log(err)
                                dispatch({
                                    type: `${authConstant.USER_LOGIN}_FAILURE`,
                                    payload: { err }
                                })
                            })
                    })
            }).catch(err => {
                console.log(err)
            })
    }
}

export const signIn = (user) => {
    return async dispatch => {

        dispatch({ type: `${authConstant.USER_LOGIN}_REQUEST` })
        auth()
            .signInWithEmailAndPassword(user.email, user.password)
            .then((data) => {
                console.log(data)

                const db = firestore()
                db.collection('users')
                    .doc(data.user.uid)
                    .update({
                        isOnline: true
                    })
                    .then(() => {
                        const name = data.user.displayName.split(" ")
                        const firstName = name[0]
                        const lastName = name[1]

                        const loggedInUser = {
                            firstName,
                            lastName,
                            uid: data.user.uid,
                            email: data.user.email
                        }

                        localStorage.setItem('user', JSON.stringify(loggedInUser))

                        dispatch({
                            type: `${authConstant.USER_LOGIN}_SUCCESS`,
                            payload: { user: loggedInUser }
                        })

                    })
                    .catch(err => {
                        console.log(err)
                    })
            })
            .catch(error => {
                console.log(error)
                dispatch({
                    type: `${authConstant.USER_LOGIN}_FAILURE`,
                    payload: { error }
                })
            })
    }
}

export const isLoggedInUser = () => {
    return async dispatch => {
        const user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null

        if (user) {
            dispatch({
                type: `${authConstant.USER_LOGIN}_SUCCESS`,
                payload: { user }
            })
        } else {
            dispatch({
                type: `${authConstant.USER_LOGIN}_FAILURE`,
                payload: { error: 'Login again please' }
            })
        }
    }
}

export const logout = (uid) => {
    return async dispatch => {
        dispatch({ type: `${authConstant.USER_LOGOUT}_REQUEST` })

        const db = firestore()
        db.collection('users')
            .doc(uid)
            .update({
                isOnline: false
            })
            .then(() => {
                auth()
                    .signOut()
                    .then(() => {
                        localStorage.clear()
                        dispatch({ type: `${authConstant.USER_LOGOUT}_SUCCESS` })
                    })
                    .catch((err) => {
                        console.log(err)
                        dispatch({ type: `${authConstant.USER_LOGOUT}_FAILURE`, payload: { error: err } })
                    })
            })
            .catch((err) => {
                console.log(err)
            })



    }
}