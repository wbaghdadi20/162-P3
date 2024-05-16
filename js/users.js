const users = [];

const addUser = (user) => {
    users.push(user);
};

const findUserByEmail = (email) => {
    return users.find(user => user.email === email);
};

module.exports = { addUser, findUserByEmail };
