import { Thread as ThreadModel } from '../models/Board.js';
import mongoose from 'mongoose';

/**
 * Lógica del enrutador para la API de threads y replies.
 */
export default function(app) {
  
  // ====================================================================
  //                         RUTAS DE THREADS (/api/threads/:board)
  // ====================================================================

  app.route('/api/threads/:board')
  
    // 1. CREAR un nuevo hilo (POST)
    .post(async (req, res) => {
      const { text, delete_password } = req.body;
      const board = req.params.board;

      if (!text || !delete_password) {
        return res.send('missing required fields');
      }

      try {
        const newThread = new ThreadModel({
          text,
          delete_password, 
          board,
          created_on: new Date(),
          bumped_on: new Date(),
          reported: false,
          replies: [],
          replycount: 0
        });

        await newThread.save();
        // Devuelve 'success' para pasar las pruebas POST
        res.send('success'); 

      } catch (err) {
        console.error(err);
        res.status(500).send('Error creating thread.');
      }
    })

    // 2. VER los 10 hilos más recientes con 3 respuestas cada uno (GET)
    .get(async (req, res) => {
      const board = req.params.board;

      try {
        const threads = await ThreadModel.find({ board: board })
          .sort({ bumped_on: 'desc' }) // Ordenar por actividad reciente
          .limit(10) // Limitar a los 10 más recientes
          .select('-delete_password -reported') // Excluir campos privados del hilo
          .lean() 

        // Para cada hilo, limitar las respuestas a 3 y excluir campos privados
        threads.forEach(thread => {
          thread.replies = thread.replies
            .sort((a, b) => b.created_on - a.created_on) // Ordenar respuestas por fecha
            .slice(0, 3) // Limitar a las 3 más recientes
            .map(reply => {
              // Excluir campos privados de la respuesta
              delete reply.delete_password;
              delete reply.reported;
              return reply;
            });
        });

        res.json(threads);

      } catch (err) {
        console.error(err);
        res.status(500).send('Error fetching threads.');
      }
    })

    // 5. REPORTAR un hilo (PUT) -- CORREGIDO
    .put(async (req, res) => {
      const { thread_id } = req.body;

      if (!thread_id || !mongoose.Types.ObjectId.isValid(thread_id)) {
          return res.send('missing thread_id or invalid ID');
      }

      try {
        const result = await ThreadModel.findByIdAndUpdate(
          thread_id,
          { $set: { reported: true } }
        );

        if (!result) {
            return res.send('no thread found');
        }

        // CORRECCIÓN: Debe devolver 'reported' según el requisito FCC
        res.send('reported');

      } catch (err) {
        console.error(err);
        res.send('could not update');
      }
    })

    // 3 & 4. ELIMINAR un hilo (DELETE)
    .delete(async (req, res) => {
      const { thread_id, delete_password } = req.body;
      
      if (!thread_id || !delete_password || !mongoose.Types.ObjectId.isValid(thread_id)) {
          return res.send('missing required fields or invalid thread_id');
      }

      try {
        const result = await ThreadModel.findOneAndDelete({
          _id: thread_id,
          delete_password: delete_password
        });

        if (!result) {
            return res.send('incorrect password');
        }

        res.send('success');

      } catch (err) {
        console.error(err);
        res.send('could not delete');
      }
    });

  // ====================================================================
  //                         RUTAS DE REPLIES (/api/replies/:board)
  // ====================================================================

  app.route('/api/replies/:board')

    // 6. CREAR una nueva respuesta (POST)
    .post(async (req, res) => {
      const { thread_id, text, delete_password } = req.body;
      const board = req.params.board;

      if (!thread_id || !text || !delete_password || !mongoose.Types.ObjectId.isValid(thread_id)) {
          return res.send('missing required fields or invalid thread_id');
      }

      try {
        const newReply = {
          text,
          delete_password,
          created_on: new Date(),
          reported: false
        };

        const updatedThread = await ThreadModel.findByIdAndUpdate(
          thread_id,
          {
            $push: { replies: newReply },
            $set: { bumped_on: new Date() }, // Actualizar fecha de actividad
            $inc: { replycount: 1 } // Incrementar contador
          },
          { new: true } 
        );

        if (!updatedThread) {
            return res.send('thread not found');
        }
        
        // Devuelve 'success' para pasar las pruebas POST
        res.send('success'); 

      } catch (err) {
        console.error(err);
        res.status(500).send('Error creating reply.');
      }
    })

    // 7. VER un solo hilo con TODAS las respuestas (GET)
    .get(async (req, res) => {
      const thread_id = req.query.thread_id;
      
      if (!thread_id || !mongoose.Types.ObjectId.isValid(thread_id)) {
          return res.send('missing thread_id or invalid ID');
      }

      try {
        const thread = await ThreadModel.findById(thread_id)
          .select('-delete_password -reported') // Excluir campos privados del hilo
          .lean();

        if (!thread) {
          return res.send('thread not found');
        }
        
        // Limpiar campos privados de CADA respuesta
        thread.replies = thread.replies.map(reply => {
            delete reply.delete_password;
            delete reply.reported;
            return reply;
        });
        
        res.json(thread);

      } catch (err) {
        console.error(err);
        res.status(500).send('Error fetching thread.');
      }
    })

    // 10. REPORTAR una respuesta (PUT) -- CORREGIDO
    .put(async (req, res) => {
      const { thread_id, reply_id } = req.body;

      if (!thread_id || !reply_id || !mongoose.Types.ObjectId.isValid(thread_id) || !mongoose.Types.ObjectId.isValid(reply_id)) {
          return res.send('missing required fields or invalid ID');
      }
      
      try {
        const updatedThread = await ThreadModel.findOneAndUpdate(
          { 
              _id: thread_id,
              'replies._id': reply_id 
          },
          {
              '$set': { 'replies.$.reported': true } 
          }
        );

        if (!updatedThread) {
            return res.send('no thread or reply found');
        }
        
        // CORRECCIÓN: Debe devolver 'reported' según el requisito FCC
        res.send('reported');

      } catch (err) {
        console.error(err);
        res.send('could not update');
      }
    })
    
    // 8 & 9. ELIMINAR una respuesta (DELETE)
    .delete(async (req, res) => {
      const { thread_id, reply_id, delete_password } = req.body;

      if (!thread_id || !reply_id || !delete_password || !mongoose.Types.ObjectId.isValid(thread_id) || !mongoose.Types.ObjectId.isValid(reply_id)) {
          return res.send('missing required fields or invalid ID');
      }
      
      try {
        const updatedThread = await ThreadModel.findOneAndUpdate(
            { 
                _id: thread_id,
                'replies._id': reply_id,
                'replies.delete_password': delete_password
            },
            {
                // Cambiar el texto a '[deleted]'
                '$set': { 'replies.$.text': '[deleted]' } 
            }
        );

        if (!updatedThread) {
            return res.send('incorrect password');
        }

        res.send('success');

      } catch (err) {
        console.error(err);
        res.send('could not delete');
      }
    });
};
