'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class AuthClient extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  };
  AuthClient.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER
    },
    client_id: {
      allowNull: false,
      type: DataTypes.STRING,
      unique: true,
    },
    client_secret: {
      allowNull: false,
      type: DataTypes.STRING
    },
    access_token: {
      allowNull: true,
      type: DataTypes.STRING,
      unique: true,
    },
    created_at: {
      allowNull: false,
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      allowNull: false,
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    sequelize,
    modelName: 'AuthClient',
    tableName: 'auth_clients',
    timestamps: false,
    underscored: true,
    indexes: [{ unique: true, fields: ['client_id'] }]
  });
  return AuthClient;
};