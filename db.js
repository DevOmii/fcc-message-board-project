import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function connectDB() {
    try {
        await mongoose.connect(process.env.DB, {
            // Opciones de conexión obsoletas eliminadas, Mongoose ahora maneja esto por defecto
        });
        console.log('Conexión exitosa a MongoDB.');
    } catch (error) {
        // En caso de error, muestra el mensaje y sale de la aplicación
        console.error('Error de conexión a MongoDB:', error.message);
        process.exit(1); 
    }
}

export default connectDB;