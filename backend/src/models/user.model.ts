import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/database';
import { v4 as uuidv4 } from 'uuid';

interface UserAttributes {
    id: string;
    username: string;
    password: string;
}

interface UserCreationAttributes extends Omit<UserAttributes, 'id'> {}

class User
    extends Model<UserAttributes, UserCreationAttributes>
    implements UserAttributes
{
    public id!: string;
    public username!: string;
    public password!: string;

    // Timestamps
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

User.init(
    {
        id: {
            type: DataTypes.STRING,
            defaultValue: () => uuidv4(),
            primaryKey: true,
        },
        username: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
        },
        password: {
            type: DataTypes.STRING,
            allowNull: false,
        },
    },
    {
        sequelize,
        tableName: 'users',
        modelName: 'User',
    }
);

export default User;
