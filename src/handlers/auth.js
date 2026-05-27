const login = async (req, res) => {
  const { email, password } = req.body;

  console.log(email, password)
};

const register = async (req, res) => {
  const { email, password } = req.body;

  console.log(email, password)
};

module.exports = { login, register }; // allows functions to be used outside