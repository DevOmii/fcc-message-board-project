import mongoose from 'mongoose';

const { Schema } = mongoose;

// Esquema para una Respuesta (Reply)
// Contiene el texto, la fecha, la contraseña (para eliminación) y el estado de reporte.
const ReplySchema = new Schema({
    text: { type: String, required: true },
    created_on: { type: Date, default: Date.now, required: true },
    delete_password: { type: String, required: true },
    reported: { type: Boolean, default: false },
}, { versionKey: false }); // versionKey: false elimina el campo "__v" de Mongoose

// Esquema para un Hilo (Thread)
// Contiene el tablero (board), el texto, las fechas de creación y actualización (bumped_on), 
// la contraseña, el estado de reporte y un array de sub-documentos de respuestas.
const ThreadSchema = new Schema({
    board: { type: String, required: true },
    text: { type: String, required: true },
    created_on: { type: Date, default: Date.now, required: true },
    bumped_on: { type: Date, default: Date.now, required: true }, // Se actualiza con nueva respuesta
    delete_password: { type: String, required: true },
    reported: { type: Boolean, default: false },
    replies: { type: [ReplySchema], default: [] }, // Array de sub-documentos Reply
    replycount: { type: Number, default: 0 } // Contador de respuestas (opcional, pero útil)
}, { versionKey: false });

// Se exporta el modelo principal de Hilos, ya que las respuestas son sub-documentos
const Thread = mongoose.model('Thread', ThreadSchema);

export { Thread };