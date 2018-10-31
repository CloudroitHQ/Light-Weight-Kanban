(function() {
	"use strict";

	var app_data = {
		people: {}
	};

	var IN_EDIT_MODE = false;

	var loadData = function() {
		var state_data = init_states(possibleStates);
		$.ajax({
			type: 'POST',
			url: 'server.php',
			data: {
				action: 'load'
			},
			dataType: 'json',
			success: function(data) {
				if (data === null) {
					data = {};
				}
				app_data.board = init_board(data);
				app_data.states = state_data.states;
				app_data.states_order = state_data.states_order;

				app_data.rawData = data;

				create_board(app_data);
				createPeopleList();
			}
		});
	};

	var createPeopleList = function() {
		var peopleList = '<form><ul class="people-list">';
		for (var i in app_data.people) {
			if (app_data.people.hasOwnProperty(i)&&(i !== 'Unassigned')) {
				var shortI = i;
				if(shortI.length > 13)
					shortI = shortI.substring(0, 10) + "...";
				peopleList += '<li><label title="' + i + '"><input type="checkbox" name="' + i + '"> ' + shortI + '</label></li>';
			}
		}
		peopleList += '</ul></form>';
		$('#navigation').html(peopleList);
	};

	var updatePeopleList = function(story) {
		var responsible = story.responsible;
		var id = story.id.toString();

		// Check if this id has already got a tag, if so, delete the id from that tag
		for (var i in app_data.people) {
			if (app_data.people.hasOwnProperty(i)) {
				// i is the tag name
				var index = app_data.people[i].indexOf(id);
				// If the story id is in one of the arrays, delete it from the array
				if (index >= 0) {
					app_data.people[i].splice(index, 1);
				}
				// If the array is empty after the deletion, remove the tag name
				if (!app_data.people[i].length) {
					delete app_data.people[i];
				}
			}
		}

		if (app_data.people[responsible]) {
			app_data.people[responsible].push(id);
		} else {
			app_data.people[responsible] = [id];
		}

		createPeopleList();
	};

	var deleteFromPeopleList = function(story) {
		var responsible = story.responsible;
		var id = story.id.toString();
		// Delete id from its tag
		var index = app_data.people[responsible].indexOf(id);
		if (index >= 0) {
			app_data.people[responsible].splice(index, 1);
		}
		// If the array is empty after the deletion, remove the tag name
		if (!app_data.people[responsible].length) {
			delete app_data.people[responsible];
		}

		createPeopleList();
	};

	var saveData = function(data) {
		if (data === '') {
			data = {};
		}
		$.ajax({
			type: 'POST',
			url: 'server.php',
			data: {
				action: 'save',
				data: data
			},
			dataType: 'json'
		});
	};

	var init_states = function(states_input) {
		var states = {};
		var states_order = [];
		for (var i = 0, len = states_input.length; i < len; i++) {
			var state = states_input[i].split(",");
			if (state.length === 2) {
				states[state[0]] = state[1];
				states_order.push(state[0]);
			}
		}
		return {
			states: states,
			states_order: states_order
		};
	};

	var init_board = function(stories) {
		var board = {};
		for (var i in stories) {
			if (stories.hasOwnProperty(i)) {
				var story = stories[i];
				story.id = i;
				if (!board[story.state]) {
					board[story.state] = [];
				}
				board[story.state].push(story);
			}
		}
		return board;
	};

	var create_story_li_item = function(story) {
		story.title = $("<div />").html(story.title).text();
		var story_element = $("<li data-state='" + story.state + "' data-id='" + story.id + "'><div class='box color_" + story.color + "' ><div class='editable' data-id='" + story.id + "'>" + story.title + ", " + story.responsible + "</div></div></li>");

		if (app_data.people[story.responsible] === undefined) {
			app_data.people[story.responsible] = [story.id.toString()];
		} else {
			app_data.people[story.responsible].push(story.id.toString());
		}
		return story_element;
	};

	var create_list = function(board, state) {
		var list = $("<ul></ul>");
		if (board[state]) {
			for (var i = 0, len = board[state].length; i < len; i++) {
				var id = board[state][i].id;
				var story_element = create_story_li_item(app_data.rawData[id]);
				list.append(story_element);
			}
		}
		return "<ul class='state' id='" + state + "'>" + list.html() + "</ul>";
	};

	var create_column = function(board, state, headlines, num) {
		var content = '<div class="col state_box state_' + state + ' col_' + num + '"><h4>' + headlines + '</h4>';
		content += create_list(board, state);
		content += '</div>';
		return content;
	};

	var create_board = function(app_data) {
		for (var j = 0; j < app_data.states_order.length; j++) {
			var state = app_data.states_order[j];
			var col = create_column(app_data.board, state, app_data.states[state], j);
			$('#board').append(col);
		}

		$('ul.state').dragsort({
			dragSelector: 'li',
			dragBetween: true,
			placeHolderTemplate: "<li class='placeholder'><div>&nbsp</div></li>",
			dragEnd: droppedElement
		});
	};

	var createNewStory = function(id, text, state, color) {
		if (state === undefined) {
			state = app_data.states_order[0];
		}
		if (color === undefined) {
			color = 0;
		}

		var arText = text.split(',');
		if (arText.length === 1) {
			arText[1] = 'Unassigned';
		}
		var story = {
			title: arText[0],
			id: id,
			responsible: arText[1].replace(/^\s+/, ''),
			state: state,
			color: color
		};
		return story;
	};

	var droppedElement = function() {
		var newState = $(this).parent().attr('id');
		var storyId = $(this).attr('data-id');
		app_data.rawData[storyId].state = newState;
		saveData(app_data.rawData);
	};

	$(document).ready(function() {
		loadData();

		$('#new').click(function() {
			var id = new Date().getTime();
			var story = createNewStory(id, "New project");
			if (app_data.rawData === undefined) {
				app_data.rawData = {};
			}
			app_data.rawData[id] = story;
			saveData(app_data.rawData);
			var storyHtml = create_story_li_item(story);
			$('#' + story.state).append(storyHtml);
			$(storyHtml).find('.editable').trigger('click');
			return false;
		});

		$('#board').on('click', '.editable', function() {
			if (!IN_EDIT_MODE) {
				var value = $(this).text();
				var storyId = $(this).parent().parent().attr('data-id');
				var oldColor = app_data.rawData[storyId].color;
				var form = '<form class="text-center"><input type="text" class="editBox" value="' + value + '" data-old-value="' + value + '" data-old-color="' + oldColor + '"/> <a class="save" href="#">save</a> &nbsp;&middot;&nbsp; <a class="cancel" href="#">cancel</a> &nbsp;&middot;&nbsp; <a href="#" class="delete">delete</a> &nbsp;&middot;&nbsp; <a href="#" class="color">color</a></form>';
				$(this).html(form);
				$(this).find('input').focus();
				IN_EDIT_MODE = true;
				setTimeout(function() {
					$('html:not(.editable)').bind('click', function() {
						$('.cancel').trigger('click');
					});
				}, 100);
			}
		});

		$('#navigation').on('change', '.people-list li', function() {
			var responsible = $(this).find('input').attr('name');
			for (var k in app_data.people[responsible]) {
				if ($('#board li[data-id="' + app_data.people[responsible][k] + '"]').hasClass('highlight')) {
					$('#board li[data-id="' + app_data.people[responsible][k] + '"]').removeClass('highlight');
				} else {
					$('#board li[data-id="' + app_data.people[responsible][k] + '"]').addClass('highlight');
				}
			}
			if ($(".people-list li :checked").length)
				$(".state_box").addClass("highlighted");
			else
				$(".state_box").removeClass("highlighted");
		});

		$(document).keyup(function(e) {
			if (e.keyCode === 27) {
				$('.cancel').trigger('click');
			} else if (e.keyCode === 78) {
				if (!IN_EDIT_MODE) {
					$('#new').trigger('click');
				}
			}
		});

		$('#board').on('click', '.cancel', function() {
			var storyId = $(this).parent().parent().attr('data-id');

			var remove_colors = "";
			for (var i = 0; i < possible_colors; i++) {
				remove_colors += "color_" + i + " ";
			}
			var oldColor = $(this).parent().find('input').attr('data-old-color');
			app_data.rawData[storyId].color = oldColor;
			$(this).parent().parent().parent().removeClass(remove_colors);
			$(this).parent().parent().parent().addClass('color_' + oldColor);

			var oldContent = $(this).parent().find('input').attr('data-old-value');
			$(this).parent().parent().text(oldContent);

			$('html').unbind('click');
			setTimeout(function() {
				IN_EDIT_MODE = false;
			}, 200);
			return false;
		});

		$('#board').on('click', '.delete', function() {
			var id = $(this).parent().parent().attr('data-id');
			$(this).parent().parent().parent().parent().remove();
			$('html').unbind('click');
			deleteFromPeopleList(app_data.rawData[id]);
			delete app_data.rawData[id];
			saveData(app_data.rawData);
			setTimeout(function() {
				IN_EDIT_MODE = false;
			}, 200);
			return false;
		});

		$('#board').on('click', '.color', function() {
			var storyId = $(this).parent().parent().attr('data-id');
			if (app_data.rawData[storyId].color === undefined) {
				app_data.rawData[storyId].color = 0;
			} else {
				$(this).parent().parent().parent().removeClass('color_' + app_data.rawData[storyId].color);
				app_data.rawData[storyId].color++;
				if (app_data.rawData[storyId].color >= possible_colors) {
					app_data.rawData[storyId].color = 0;
				}
			}
			$(this).parent().parent().parent().addClass('color_' + app_data.rawData[storyId].color);
			return false;
		});

		$('#board').on('submit', 'form', function() {
			var title = $(this).find('input').val();
			var storyId = $(this).parent().attr('data-id');
			var state = $(this).parent().parent().parent().attr('data-state');
			var story = createNewStory(storyId, title, state, app_data.rawData[storyId].color);

			app_data.rawData[storyId] = story;
			saveData(app_data.rawData);
			$('html').unbind('click');
			$(this).parent().text(story.title + ", " + story.responsible);
			setTimeout(function() {
				IN_EDIT_MODE = false;
			}, 200);
			// Update tag list
			updatePeopleList(story);
			return false;
		});

		$('#board').on('click', '.save', function() {
			$(this).parent().submit();
			return false;
		});

		$('#board').on('click', '.editBox', function(event) {
			event.stopPropagation();
		});
	});
})();
