const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
const port = 3000;

// Middleware to parse JSON bodies
app.use(express.json());
app.use(cors());

// MySQL connection pool
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'Kriti@2006',
  database: 'pet',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Simple test route
app.get('/', (req, res) => {
  res.send('Virtual Pet Backend is running!');
});

// Register new user
app.post('/register', (req, res) => {
  const { username, email } = req.body;

  if (!username || !email) {
    return res.status(400).json({ error: 'Username and email are required' });
  }

  // Check if email already exists
  pool.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
    if (err) {
      console.error('DB error:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (results.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Insert new user
    const insertQuery = 'INSERT INTO users (username, email) VALUES (?, ?)';
    pool.query(insertQuery, [username, email], (err, insertResult) => {
      if (err) {
        console.error('DB error:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      res.status(201).json({ 
        message: 'User registered successfully', 
        userId: insertResult.insertId,
        username,
        email
      });
    });
  });
});

// Login user
app.post('/login', (req, res) => {
  const { userId, email } = req.body;

  if (!userId && !email) {
    return res.status(400).json({ error: 'Please provide userId or email to login' });
  }

  const query = userId 
    ? 'SELECT * FROM users WHERE user_id = ?' 
    : 'SELECT * FROM users WHERE email = ?';

  const param = userId ? userId : email;

  pool.query(query, [param], (err, results) => {
    if (err) {
      console.error('DB error:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = results[0];
    res.json({ 
      message: 'Login successful', 
      userId: user.user_id, 
      username: user.username, 
      email: user.email 
    });
  });
});

// Add new pet
app.post('/pets', (req, res) => {
  const { user_id, pet_name, pet_type_id, age } = req.body;

  if (!user_id || !pet_name || !pet_type_id || age == null) {
    return res.status(400).json({ error: 'user_id, pet_name, pet_type_id, and age are required' });
  }

  if (isNaN(pet_type_id)) {
    return res.status(400).json({ error: 'pet_type_id must be a number' });
  }

  const query = `
    INSERT INTO pets (user_id, pet_name, pet_type_id, age)
    VALUES (?, ?, ?, ?)
  `;

  pool.query(query, [user_id, pet_name, pet_type_id, age], (err, results) => {
    if (err) {
      console.error('DB Error:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    res.status(201).json({ message: 'Pet added', petId: results.insertId });
  });
});

// Get all pets for a user
app.get('/users/:userId/pets', (req, res) => {
  const userId = parseInt(req.params.userId);

  const query = `
    SELECT p.*, pt.type_name 
    FROM pets p
    JOIN pet_types pt ON p.pet_type_id = pt.pet_type_id
    WHERE p.user_id = ?
  `;
  
  pool.query(query, [userId], (err, results) => {
    if (err) {
      console.error('DB error:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    res.json(results);
  });
});

// Update pet
app.put('/pets/:petId', (req, res) => {
  const petId = req.params.petId;
  const { pet_name, pet_type_id, age, happiness_level, hunger_level } = req.body;

  if (!pet_name && !pet_type_id && age == null && happiness_level == null && hunger_level == null) {
    return res.status(400).json({ error: 'At least one field to update is required' });
  }

  let fields = [];
  let values = [];

  if (pet_name) {
    fields.push('pet_name = ?');
    values.push(pet_name);
  }
  if (pet_type_id) {
    fields.push('pet_type_id = ?');
    values.push(pet_type_id);
  }
  if (age != null) {
    fields.push('age = ?');
    values.push(age);
  }
  if (happiness_level != null) {
    fields.push('happiness_level = ?');
    values.push(happiness_level);
  }
  if (hunger_level != null) {
    fields.push('hunger_level = ?');
    values.push(hunger_level);
  }

  values.push(petId);

  const query = `UPDATE pets SET ${fields.join(', ')} WHERE pet_id = ?`;

  pool.query(query, values, (err, results) => {
    if (err) {
      console.error('DB Error:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (results.affectedRows === 0) {
      return res.status(404).json({ error: 'Pet not found' });
    }

    res.json({ message: 'Pet updated' });
  });
});

// Delete pet
app.delete('/pets/:petId', (req, res) => {
  const petId = req.params.petId;

  const query = 'DELETE FROM pets WHERE pet_id = ?';

  pool.query(query, [petId], (err, results) => {
    if (err) {
      console.error('DB Error:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (results.affectedRows === 0) {
      return res.status(404).json({ error: 'Pet not found' });
    }

    res.json({ message: 'Pet deleted successfully' });
  });
});

// Feed pet (improved with better error handling)
app.post('/pets/:petId/feed', (req, res) => {
  const petId = parseInt(req.params.petId);
  const { food_id } = req.body;

  // First check if pet exists
  pool.query('SELECT * FROM pets WHERE pet_id = ?', [petId], (err, petResults) => {
    if (err) {
      console.error('DB Error:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (petResults.length === 0) {
      return res.status(404).json({ error: 'Pet not found' });
    }

    if (food_id) {
      // Check if food exists
      pool.query('SELECT * FROM foods WHERE food_id = ?', [food_id], (err, foodResults) => {
        if (err) {
          console.error('DB Error:', err);
          return res.status(500).json({ error: 'Database error' });
        }

        if (foodResults.length === 0) {
          return res.status(400).json({ error: 'Food not found' });
        }

        // Try stored procedure first
        pool.query('CALL feed_pet(?, ?)', [petId, food_id], (err, results) => {
          if (err) {
            console.error('Stored procedure error:', err);
            
            // Fallback to manual feeding if stored procedure fails
            const nutrition = foodResults[0].nutrition_value;
            
            // Insert into feeding log
            pool.query('INSERT INTO pet_feeding_log (pet_id, food_id) VALUES (?, ?)', 
              [petId, food_id], (logErr, logResult) => {
                if (logErr) {
                  console.error('Log Error:', logErr);
                }
                
                // Update hunger level
                pool.query(
                  'UPDATE pets SET hunger_level = LEAST(hunger_level + ?, 100) WHERE pet_id = ?',
                  [nutrition, petId],
                  (updateErr, updateResult) => {
                    if (updateErr) {
                      console.error('Update Error:', updateErr);
                      return res.status(500).json({ error: 'Failed to update pet hunger' });
                    }
                    
                    res.json({ 
                      message: `Pet has been fed with ${foodResults[0].food_name}! (+${nutrition} hunger)`,
                      nutrition_gained: nutrition
                    });
                  }
                );
              }
            );
          } else {
            res.json({ 
              message: `Pet has been fed with ${foodResults[0].food_name}! (+${foodResults[0].nutrition_value} hunger)`,
              nutrition_gained: foodResults[0].nutrition_value
            });
          }
        });
      });
    } else {
      // Basic feeding (increase hunger by 10)
      const query = `
        UPDATE pets
        SET hunger_level = LEAST(hunger_level + 10, 100)
        WHERE pet_id = ?
      `;

      pool.query(query, [petId], (err, results) => {
        if (err) {
          console.error('DB Error:', err);
          return res.status(500).json({ error: 'Database error' });
        }

        res.json({ message: 'Pet has been fed! (+10 hunger)' });
      });
    }
  });
});

// Play with pet (improved with better error handling)
app.post('/pets/:petId/play', (req, res) => {
  const petId = parseInt(req.params.petId);
  const { activity_id } = req.body;

  // First check if pet exists
  pool.query('SELECT * FROM pets WHERE pet_id = ?', [petId], (err, petResults) => {
    if (err) {
      console.error('DB Error:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (petResults.length === 0) {
      return res.status(404).json({ error: 'Pet not found' });
    }

    if (activity_id) {
      // Check if activity exists
      pool.query('SELECT * FROM activities WHERE activity_id = ?', [activity_id], (err, activityResults) => {
        if (err) {
          console.error('DB Error:', err);
          return res.status(500).json({ error: 'Database error' });
        }

        if (activityResults.length === 0) {
          return res.status(400).json({ error: 'Activity not found' });
        }

        // Try stored procedure first
        pool.query('CALL play_with_pet(?, ?)', [petId, activity_id], (err, results) => {
          if (err) {
            console.error('Stored procedure error:', err);
            
            // Fallback to manual playing if stored procedure fails
            const happiness = activityResults[0].happiness_boost;
            
            // Insert into activity log
            pool.query('INSERT INTO pet_activity_log (pet_id, activity_id) VALUES (?, ?)', 
              [petId, activity_id], (logErr, logResult) => {
                if (logErr) {
                  console.error('Log Error:', logErr);
                }
                
                // Update happiness level
                pool.query(
                  'UPDATE pets SET happiness_level = LEAST(happiness_level + ?, 100) WHERE pet_id = ?',
                  [happiness, petId],
                  (updateErr, updateResult) => {
                    if (updateErr) {
                      console.error('Update Error:', updateErr);
                      return res.status(500).json({ error: 'Failed to update pet happiness' });
                    }
                    
                    res.json({ 
                      message: `You played ${activityResults[0].activity_name} with the pet! (+${happiness} happiness)`,
                      happiness_gained: happiness
                    });
                  }
                );
              }
            );
          } else {
            res.json({ 
              message: `You played ${activityResults[0].activity_name} with the pet! (+${activityResults[0].happiness_boost} happiness)`,
              happiness_gained: activityResults[0].happiness_boost
            });
          }
        });
      });
    } else {
      // Basic playing (increase happiness by 10)
      const query = `
        UPDATE pets
        SET happiness_level = LEAST(happiness_level + 10, 100)
        WHERE pet_id = ?
      `;

      pool.query(query, [petId], (err, results) => {
        if (err) {
          console.error('DB Error:', err);
          return res.status(500).json({ error: 'Database error' });
        }

        res.json({ message: 'You played with the pet! (+10 happiness)' });
      });
    }
  });
});

// Get pet status
app.get('/pets/:petId/status', (req, res) => {
  const petId = req.params.petId;

  const query = `
    SELECT 
      p.pet_id,
      p.pet_name,
      pt.type_name AS pet_type,
      p.age,
      p.happiness_level,
      p.hunger_level
    FROM pets p
    JOIN pet_types pt ON p.pet_type_id = pt.pet_type_id
    WHERE p.pet_id = ?
  `;

  pool.query(query, [petId], (err, results) => {
    if (err) {
      console.error('DB Error:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: 'Pet not found' });
    }

    res.json(results[0]);
  });
});

// Get all pet types
app.get('/pet-types', (req, res) => {
  pool.query('SELECT * FROM pet_types', (err, results) => {
    if (err) {
      console.error('Error fetching pet types:', err);
      return res.status(500).json({ error: 'Failed to fetch pet types' });
    }
    res.json(results);
  });
});

// Get all foods
app.get('/foods', (req, res) => {
  const query = 'SELECT * FROM foods';

  pool.query(query, (err, results) => {
    if (err) {
      console.error('DB Error:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    res.json(results);
  });
});

// Get all activities
app.get('/activities', (req, res) => {
  pool.query('SELECT * FROM activities', (err, results) => {
    if (err) {
      console.error('Error fetching activities:', err);
      return res.status(500).json({ error: 'Failed to fetch activities' });
    }
    res.json(results);
  });
});

// Get feeding log for a specific pet
app.get('/pets/:petId/feeding-log', (req, res) => {
  const petId = req.params.petId;

  const query = `
    SELECT pfl.*, f.food_name, pfl.fed_at as timestamp
    FROM pet_feeding_log pfl
    JOIN foods f ON pfl.food_id = f.food_id
    WHERE pfl.pet_id = ?
    ORDER BY pfl.fed_at DESC
  `;

  pool.query(query, [petId], (err, results) => {
    if (err) {
      console.error('DB Error:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    res.json(results);
  });
});

// Get activity log for a specific pet
app.get('/pets/:petId/activity-log', (req, res) => {
  const petId = req.params.petId;

  const query = `
    SELECT pal.*, a.activity_name, pal.played_at as timestamp
    FROM pet_activity_log pal
    JOIN activities a ON pal.activity_id = a.activity_id
    WHERE pal.pet_id = ?
    ORDER BY pal.played_at DESC
  `;

  pool.query(query, [petId], (err, results) => {
    if (err) {
      console.error('DB Error:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    res.json(results);
  });
});

// Get food log for all pets of a user
app.get('/users/:userId/food-log', (req, res) => {
  const userId = req.params.userId;

  const query = `
    SELECT pfl.*, f.food_name, p.pet_name, pfl.fed_at as timestamp
    FROM pet_feeding_log pfl
    JOIN foods f ON pfl.food_id = f.food_id
    JOIN pets p ON pfl.pet_id = p.pet_id
    WHERE p.user_id = ?
    ORDER BY pfl.fed_at DESC
  `;

  pool.query(query, [userId], (err, results) => {
    if (err) {
      console.error('DB Error:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    res.json(results);
  });
});

// Get activities log for all pets of a user
app.get('/users/:userId/activities-log', (req, res) => {
  const userId = req.params.userId;

  const query = `
    SELECT pal.*, a.activity_name, p.pet_name, pal.played_at as timestamp
    FROM pet_activity_log pal
    JOIN activities a ON pal.activity_id = a.activity_id
    JOIN pets p ON pal.pet_id = p.pet_id
    WHERE p.user_id = ?
    ORDER BY pal.played_at DESC
  `;

  pool.query(query, [userId], (err, results) => {
    if (err) {
      console.error('DB Error:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    res.json(results);
  });
});

// Add feeding log entry (manual)
app.post('/pet-feeding-log', (req, res) => {
  const { pet_id, food_id } = req.body;

  if (!pet_id || !food_id) {
    return res.status(400).json({ error: 'pet_id and food_id are required' });
  }

  const query = `
    INSERT INTO pet_feeding_log (pet_id, food_id)
    VALUES (?, ?)
  `;

  pool.query(query, [pet_id, food_id], (err, results) => {
    if (err) {
      console.error('DB Error:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    res.status(201).json({ message: 'Feeding log added', logId: results.insertId });
  });
});

// Delete feeding log entry
app.delete('/pet-feeding-log/:logId', (req, res) => {
  const logId = req.params.logId;

  const query = 'DELETE FROM pet_feeding_log WHERE log_id = ?';

  pool.query(query, [logId], (err, results) => {
    if (err) {
      console.error('DB Error:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (results.affectedRows === 0) {
      return res.status(404).json({ error: 'Feeding log not found' });
    }

    res.json({ message: 'Feeding log deleted' });
  });
});

// Add activity log entry (manual)
app.post('/pet-activity-log', (req, res) => {
  const { pet_id, activity_id } = req.body;

  if (!pet_id || !activity_id) {
    return res.status(400).json({ error: 'pet_id and activity_id are required' });
  }

  const query = `
    INSERT INTO pet_activity_log (pet_id, activity_id)
    VALUES (?, ?)
  `;

  pool.query(query, [pet_id, activity_id], (err, results) => {
    if (err) {
      console.error('DB Error:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    res.status(201).json({ message: 'Activity log added', logId: results.insertId });
  });
});

// Delete activity log entry
app.delete('/pet-activity-log/:logId', (req, res) => {
  const { logId } = req.params;

  const query = 'DELETE FROM pet_activity_log WHERE log_id = ?';

  pool.query(query, [logId], (err, results) => {
    if (err) {
      console.error('DB Error:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (results.affectedRows === 0) {
      return res.status(404).json({ error: 'Activity log not found' });
    }

    res.json({ message: 'Activity log deleted' });
  });
});


// Decrease hunger for random pets
// Update the decrease-hunger endpoint
app.post('/pets/decrease-hunger', (req, res) => {
  const { userId } = req.body; // Get userId from frontend
  const decreaseAmount = 10;

  // 1. Get ONLY the logged-in user's pets
  pool.query(
    `SELECT pet_id FROM pets WHERE user_id = ? ORDER BY RAND() LIMIT 2`, // Randomly pick 1 pet
    [userId],
    (err, petResults) => {
      if (err) {
        console.error('DB Error:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      // 2. If user has pets, decrease hunger for 1 random pet
      if (petResults.length > 0) {
        const petId = petResults[0].pet_id;
        
        pool.query(
          `UPDATE pets SET hunger_level = GREATEST(hunger_level - ?, 0) 
           WHERE pet_id = ?`,
          [decreaseAmount, petId],
          (updateErr, updateResult) => {
            if (updateErr) {
              console.error('DB Error:', updateErr);
              return res.status(500).json({ error: 'Database error' });
            }

            // 3. Return the updated pet
            pool.query(
              `SELECT * FROM pets WHERE pet_id = ?`,
              [petId],
              (selectErr, updatedPets) => {
                if (selectErr) {
                  console.error('DB Error:', selectErr);
                  return res.status(500).json({ error: 'Database error' });
                }
                
                res.json({ 
                  message: `Decreased hunger for 1 pet (-${decreaseAmount})`,
                  updatedPet: updatedPets[0] // Return the single updated pet
                });
              }
            );
          }
        );
      } else {
        res.json({ message: "No pets found for this user" });
      }
    }
  );
});


app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});