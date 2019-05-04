let responseBody = {
    generalInfo: {},
    bots: [],
    targets: []
};

class Bot {
    constructor(name) {
        this.bot = {
            name: name,
            health: {
                value: 100
            },
            sensor: {
                active: false,
                targetId: null,
                length: 50
            },
            direction: {
                changeRate: 5,
                currentChangeRate: 0,
                speed: 5,
                _innerAngle: 45,
                set angle(value) {
                    this._innerAngle = value % 360;
                },

                get angle() {
                    return this._innerAngle;
                }
            },
            location: {
                x: globalConfigs.canvasElement.width / 2,
                y: globalConfigs.canvasElement.height / 2
            },
            size: 10
        };
    }

    get data() {
        return this.bot;
    }
}

var globalConfigs = {
    canvasElement: {
        width: 600,
        height: 600
    },
    includeChildrenGeneration: true,
    includeHealthReducing: true,
    yearIterations: 30,
    currentYearIterations: 0,
    context: null
};

var fromPolarToCartesian = (length, angleInDegrees) => {
    return {
        x: length * Math.cos(angleInDegrees / 180 * Math.PI),
        y: length * Math.sin(angleInDegrees / 180 * Math.PI)
    };
};

var inCircle = (pointToCheck, circle) => {
    return Math.pow(pointToCheck.x - circle.x, 2) + Math.pow(pointToCheck.y - circle.y, 2) <= Math.pow(circle
        .radius, 2);
};

var distanceBetweenTwoPoints = (firstPoint, secondPoint) => {
    return Math.round(Math.sqrt(Math.pow(firstPoint.x - secondPoint.x, 2) + Math.pow(firstPoint.y - secondPoint.y, 2)));
};

var distanceBetweenTwoRectangles = (firstRect, secondRect) => {
    var horizontalDistance = 0;

    if (secondRect.x1 > firstRect.x2) {
        horizontalDistance = secondRect.x1 - firstRect.x2;
    } else if (firstRect.x1 > secondRect.x2) {
        horizontalDistance = firstRect.x1 - secondRect.x2;
    }

    var verticalDistance = 0;

    if (secondRect.y1 > firstRect.y2) {
        verticalDistance = secondRect.y1 - firstRect.y2;
    } else if (firstRect.y1 > secondRect.y2) {
        verticalDistance = firstRect.y1 - secondRect.y2;
    }

    return Math.round(Math.sqrt(Math.pow(horizontalDistance, 2) + Math.pow(verticalDistance, 2)));
};

var getCircleCoordinates = (x, y, radius) => {
    var result = [];

    for (var i = 0; i < 2 * Math.PI; i += 0.05) {
        result.push({
            y: y + (radius * Math.sin(i)),
            x: x + (radius * Math.cos(i)),
        });
    }

    return result;
};

var drawFood = () => {
    if (food.foodSpawnCounter <= food.currentFoodSpawnCounter) {
        var x = Math.round(Math.random() * globalConfigs.canvasElement.width);
        var y = Math.round(Math.random() * globalConfigs.canvasElement.height);

        food.items.push({
            id: food.primaryIndexCounter,
            location: {
                x,
                y
            }
        });
        food.currentFoodSpawnCounter = 0;
        food.primaryIndexCounter++;
    } else {
        food.currentFoodSpawnCounter++;
    }
};

var makeBotsOlder = bots => {
    if (globalConfigs.includeHealthReducing) {
        for (bot of bots) {
            var speedFactor = bot.direction.speed;
            var sensorLengthFactor = bot.sensor.length / 10;

            bot.health.value -= Math.round(speedFactor + sensorLengthFactor);
        }
    }
};

var searchBotTarget = bot => {
    var botTargets = [];

    for (var foodItem of food.items) {
        var pointToCheck = {
            x: foodItem.location.x,
            y: foodItem.location.y,
        };
        var circle = {
            x: bot.location.x,
            y: bot.location.y,
            radius: bot.sensor.length
        };

        if (inCircle(pointToCheck, circle)) {
            botTargets.push({
                id: foodItem.id,
                distance: distanceBetweenTwoPoints({
                    x: foodItem.location.x,
                    y: foodItem.location.y
                }, {
                    x: bot.location.x,
                    y: bot.location.y
                })
            });
        }
    }

    if (botTargets.length === 0) {
        bot.sensor.active = false;
        return;
    }

    bot.sensor.active = true;
    var nearestTarget = botTargets[0];

    for (var target of botTargets) {
        if (target.distance < nearestTarget.distance) {
            nearestTarget = {
                id: target.id
            }
        }
    }

    bot.sensor.targetId = nearestTarget.id;
};

var getTargetById = id => {
    var element = food.items.find(element => element.id === id);

    if (element === undefined)
        return null;

    return {
        element,
        key: food.items.findIndex(element => element.id === id)
    };
};

var isBotReachAnyTarget = bot => {
    for (var [index, foodItem] of food.items.entries()) {
        var distance = distanceBetweenTwoRectangles({
            x1: bot.location.x,
            y1: bot.location.y,
            x2: bot.location.x + bot.size,
            y2: bot.location.y + bot.size
        }, {
            x1: foodItem.location.x,
            y1: foodItem.location.y,
            x2: foodItem.location.x + 5,
            y2: foodItem.location.y + 5
        });

        if (distance <= bot.direction.speed) {
            food.items.splice(index, 1);
            bot.health.value += 50;
        }
    }
};

var drawBots = () => {
    globalConfigs.currentYearIterations++;

    if (globalConfigs.currentYearIterations >= globalConfigs.yearIterations) {
        makeBotsOlder(bots);
        globalConfigs.currentYearIterations = 0;
    }

    if (bots.length === 0) {
        bots.push(new Bot('Bot 1').data);
    }

    for (var [index, bot] of bots.entries()) {
        if (bot.health.value <= 0) {
            bots.splice(index, 1)
        } else if (globalConfigs.includeChildrenGeneration && bot.health.value >= 200) {
            var newBot = new Bot('Bot ' + bots.length).data;
            newBot.direction.speed = bot.direction.speed + Math.round(Math.random() * 4 - 2);
            newBot.sensor.length = bot.sensor.length + Math.round(Math.random() * 4 - 2);
            newBot.direction.changeRate = bot.direction.changeRate + Math.round(Math.random() * 2 - 1);
            bots.push(newBot);
            bot.health.value = 50;
        }

        searchBotTarget(bot);
        isBotReachAnyTarget(bot);
        var circleCoordinates = getCircleCoordinates(bot.location.x + bot.size / 2, bot.location.y + bot.size / 2,
            bot.sensor.length);

        if (bot.location.y <= 0) {
            bot.direction.angle = 90;
        } else if (bot.location.y + bot.size >= globalConfigs.canvasElement.height) {
            bot.direction.angle = 270;
        }

        if (bot.location.x <= 0) {
            bot.direction.angle = 0;
        } else if (bot.location.x + bot.size >= globalConfigs.canvasElement.width) {
            bot.direction.angle = 180;
        }

        var locationChange = fromPolarToCartesian(bot.direction.speed, bot.direction.angle);

        bot.location.y += Math.round(locationChange.y);
        bot.location.x += Math.round(locationChange.x);

        if (bot.sensor.active) {
            var target = getTargetById(bot.sensor.targetId);

            if (target) {
                target = target.element;
                var angleBetweenTargetAndBot = Math.atan2(target.location.y - bot.location.y, target.location.x - bot.location.x);

                bot.direction.angle = Math.round(angleBetweenTargetAndBot / Math.PI * 180);
            }
        } else {
            if (bot.direction.currentChangeRate >= bot.direction.changeRate) {
                bot.direction.angle = Math.round(Math.random() * 360);

                bot.direction.currentChangeRate = 0;
            }

            bot.direction.currentChangeRate++;
        }
    }
};

var bots = [];
var food = {
    items: [],
    primaryIndexCounter: 1,
    foodSpawnCounter: 10,
    currentFoodSpawnCounter: 0
};

var writeResponse = () => {
    responseBody = {
        bots,
        targets: food
    };
};

setInterval(() => {
    drawFood();
    drawBots();
    writeResponse();

    module.exports.data = responseBody;
}, 50);

module.exports = {
    data: responseBody
};
