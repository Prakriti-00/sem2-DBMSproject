-- Create the database
CREATE DATABASE IF NOT EXISTS pet;
USE pet;

-- 1. Users Table
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE
);

-- 2. Pet Types Table
CREATE TABLE pet_types (
    pet_type_id INT AUTO_INCREMENT PRIMARY KEY,
    type_name VARCHAR(30) NOT NULL
);

-- 3. Pets Table (linked to users and pet_types)
CREATE TABLE pets (
    pet_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    pet_type_id INT,
    pet_name VARCHAR(50),
    age INT,
    happiness_level INT DEFAULT 50,
    hunger_level INT DEFAULT 50,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (pet_type_id) REFERENCES pet_types(pet_type_id)
);

-- 4. Foods Table
CREATE TABLE foods (
    food_id INT AUTO_INCREMENT PRIMARY KEY,
    food_name VARCHAR(50),
    nutrition_value INT
);

-- 5. Activities Table
CREATE TABLE activities (
    activity_id INT AUTO_INCREMENT PRIMARY KEY,
    activity_name VARCHAR(50),
    happiness_boost INT
);

-- 6. Pet Feeding Log Table
CREATE TABLE pet_feeding_log (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    pet_id INT,
    food_id INT,
    fed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pet_id) REFERENCES pets(pet_id) ON DELETE CASCADE,
    FOREIGN KEY (food_id) REFERENCES foods(food_id)
);

-- 7. Pet Activity Log Table
CREATE TABLE pet_activity_log (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    pet_id INT,
    activity_id INT,
    played_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pet_id) REFERENCES pets(pet_id) ON DELETE CASCADE,
    FOREIGN KEY (activity_id) REFERENCES activities(activity_id)
);

-- Pet Types
INSERT INTO pet_types (type_name) VALUES 
('Dog'), ('Cat'), ('Rabbit'), ('Snake'), ('Bird');

-- Foods with appropriate nutrition values
INSERT INTO foods (food_name, nutrition_value) VALUES 
('Dog Biscuit', 25),
('Fish', 30),
('Carrot', 15),
('Mouse', 35),
('Seeds', 20),
('Premium Pet Food', 40),
('Treats', 10),
('Vegetables', 20);

-- Activities with happiness boosts
INSERT INTO activities (activity_name, happiness_boost) VALUES 
('Fetch', 20),
('Laser Chase', 15),
('Hop Time', 10),
('Sun Bask', 15),
('Singing Session', 20),
('Trick Training', 25),
('Grooming', 15),
('Walk', 18);

-- Sample users
INSERT INTO users (username, email) VALUES
('prakriti', 'prakriti@email.com'),
('preksha', 'preksha@email.com'),
('reshma', 'reshma@email.com');

-- Sample pets
INSERT INTO pets (user_id, pet_type_id, pet_name, age, happiness_level, hunger_level)
VALUES 
(1, 3, 'Snowy', 2, 70, 30),
(2, 1, 'Bruno', 3, 60, 40),
(3, 5, 'Tweety', 1, 85, 25);

-- Sample feeding logs
INSERT INTO pet_feeding_log (pet_id, food_id) VALUES 
(1, 3),
(2, 1),
(3, 5);

-- Sample activity logs
INSERT INTO pet_activity_log (pet_id, activity_id) VALUES 
(1, 3),
(2, 1),
(3, 5);

-- Stored procedure to feed pets with specific food
DELIMITER $$

CREATE PROCEDURE feed_pet(IN p_pet_id INT, IN p_food_id INT)
BEGIN
    DECLARE nutrition INT;
    
    -- Get nutrition value of the food
    SELECT nutrition_value INTO nutrition
    FROM foods
    WHERE food_id = p_food_id;

    -- Insert into feeding log
    INSERT INTO pet_feeding_log (pet_id, food_id)
    VALUES (p_pet_id, p_food_id);

    -- Update hunger level, capped at 100
    UPDATE pets
    SET hunger_level = LEAST(hunger_level + nutrition, 100)
    WHERE pet_id = p_pet_id;
END$$

DELIMITER ;

-- Stored procedure to play with pets
DELIMITER $$

CREATE PROCEDURE play_with_pet(IN p_pet_id INT, IN p_activity_id INT)
BEGIN
    DECLARE boost INT;

    -- Get happiness boost value
    SELECT happiness_boost INTO boost
    FROM activities
    WHERE activity_id = p_activity_id;

    -- Insert into activity log
    INSERT INTO pet_activity_log (pet_id, activity_id)
    VALUES (p_pet_id, p_activity_id);

    -- Update happiness level, capped at 100
    UPDATE pets
    SET happiness_level = LEAST(happiness_level + boost, 100)
    WHERE pet_id = p_pet_id;
END$$

DELIMITER ;

-- Triggers to ensure valid happiness and hunger levels
DELIMITER $$

CREATE TRIGGER before_pets_update
BEFORE UPDATE ON pets
FOR EACH ROW
BEGIN
    IF NEW.happiness_level < 0 THEN
        SET NEW.happiness_level = 0;
    ELSEIF NEW.happiness_level > 100 THEN
        SET NEW.happiness_level = 100;
    END IF;

    IF NEW.hunger_level < 0 THEN
        SET NEW.hunger_level = 0;
    ELSEIF NEW.hunger_level > 100 THEN
        SET NEW.hunger_level = 100;
    END IF;
END$$

CREATE TRIGGER before_pets_insert
BEFORE INSERT ON pets
FOR EACH ROW
BEGIN
    IF NEW.happiness_level < 0 THEN
        SET NEW.happiness_level = 0;
    ELSEIF NEW.happiness_level > 100 THEN
        SET NEW.happiness_level = 100;
    END IF;

    IF NEW.hunger_level < 0 THEN
        SET NEW.hunger_level = 0;
    ELSEIF NEW.hunger_level > 100 THEN
        SET NEW.hunger_level = 100;
    END IF;
END$$

DELIMITER ;


select * from pets;
select * from users;

