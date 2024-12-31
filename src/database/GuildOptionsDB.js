const sequelize = require("sequelize");
const { database, cache } = require("../database");
const { Model, DataTypes } = sequelize;

class GuildOptionsDB extends Model {}

GuildOptionsDB.init(
  {
    guildID: { type: DataTypes.STRING, unique: true },
    mode: DataTypes.INTEGER,
    flags: { type: DataTypes.INTEGER, allowNull: true },
    musicServices: { type: DataTypes.TEXT, allowNull: true },
    serviceSettings: { type: DataTypes.TEXT, allowNull: true },
  },
  {
    sequelize: database,
    modelName: "GuildOptions"
  }
);

// Sync the model with the database, ensuring any new columns are added
(async () => {
  try {
    await GuildOptionsDB.sync({ alter: true });
    console.log("Database synchronized successfully.");
  } catch (error) {
    console.error("Error synchronizing database:", error);
  }
})();

module.exports = cache.init(GuildOptionsDB);
