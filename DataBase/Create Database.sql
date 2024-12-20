CREATE TABLE card (
    cardid        SERIAL NOT NULL,
    card_name     VARCHAR(100) NOT NULL,
    card_position VARCHAR(100) NOT NULL,
    card_company  VARCHAR(100) NOT NULL,
    visibility    VARCHAR(1) NOT NULL,
    card_description varchar(1000) not null,
    card_contact VARCHAR(50) not null,
    user_userid   INTEGER NOT NULL,
    tag_tagid     INTEGER NOT NULL
);


ALTER TABLE card ADD CONSTRAINT card_pk PRIMARY KEY ( cardid );

CREATE TABLE tag (
    tagid   SERIAL NOT NULL,
    tagname VARCHAR(100) NOT NULL
    
);

-- Error - Index tag__IDX has no columns

ALTER TABLE tag ADD CONSTRAINT tag_pk PRIMARY KEY ( tagid );

CREATE TABLE "user" (
    userid   SERIAL NOT NULL,
    name     VARCHAR(100) NOT NULL,
    email    VARCHAR(100) NOT NULL,
    password VARCHAR(100) NOT NULL
);

ALTER TABLE "user" ADD CONSTRAINT user_pk PRIMARY KEY ( userid );

ALTER TABLE card
    ADD CONSTRAINT card_tag_fk FOREIGN KEY ( tag_tagid )
        REFERENCES tag ( tagid );

ALTER TABLE card
    ADD CONSTRAINT card_user_fk FOREIGN KEY ( user_userid )
        REFERENCES "user" ( userid );


       
       

INSERT INTO "ByteCard".tag (tagname)
VALUES 
    ('Software Development'),
    ('Project Management'),
    ('Marketing'),
    ('Data Science'),
    ('Design'),
    ('Sales'),
    ('Finance'),
    ('Customer Support'),
    ('Human Resources'),
    ('Engineering');

INSERT INTO "user" (name, email, password)
VALUES 
    ('Alice Johnson', 'alice.johnson@example.com', 'password123'),
    ('Bob Smith', 'bob.smith@example.com', 'securePass456'),
    ('Charlie Brown', 'charlie.brown@example.com', 'qwerty789'),
    ('Diana Prince', 'diana.prince@example.com', 'wonderWoman123'),
    ('Ethan Hunt', 'ethan.hunt@example.com', 'missionImpossible007');

   
INSERT INTO "ByteCard".card (card_name, card_position, card_company, visibility, card_description, card_contact, user_userid, tag_tagid)
VALUES 
    ('John Doe', 'Software Engineer', 'Google', 'Y', 
     'Develops scalable applications for Google Cloud Platform.', '123-456-7890', 1, 1),
    ('Jane Smith', 'Product Manager', 'Microsoft', 'Y', 
     'Manages product roadmaps and cross-team collaboration for Azure products.', '234-567-8901', 1, 2),
    ('Michael Brown', 'Marketing Specialist', 'Meta', 'Y', 
     'Creates targeted marketing campaigns for Facebook and Instagram.', '345-678-9012', 1, 3),
    ('Sara Lee', 'Data Scientist', 'Netflix', 'Y', 
     'Builds machine learning models to optimize user recommendations.', '456-789-0123', 1, 4),
    ('David Wilson', 'UX Designer', 'Adobe', 'Y', 
     'Designs intuitive interfaces for Adobe Creative Cloud products.', '567-890-1234', 1, 5),
    ('Emily Clark', 'Sales Executive', 'Salesforce', 'Y', 
     'Drives client acquisition and retention through tailored CRM solutions.', '678-901-2345', 1, 6),
    ('James Taylor', 'Financial Analyst', 'Goldman Sachs', 'Y', 
     'Analyzes market trends to guide investment strategies.', '789-012-3456', 1, 7),
    ('Linda Martinez', 'Customer Support Lead', 'Amazon', 'Y', 
     'Oversees customer service team ensuring timely resolution of queries.', '890-123-4567', 1, 8),
    ('Robert Hernandez', 'HR Manager', 'IBM', 'N', 
     'Implements HR policies and manages employee relations.', '901-234-5678', 1, 9),
    ('Sophia Garcia', 'Mechanical Engineer', 'Tesla', 'N', 
     'Designs and tests mechanical components for Tesla vehicles.', '012-345-6789', 1, 10);